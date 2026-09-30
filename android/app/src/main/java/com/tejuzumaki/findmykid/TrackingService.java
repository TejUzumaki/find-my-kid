package com.tejuzumaki.findmykid;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;

import org.json.JSONObject;

public class TrackingService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "fmk_tracking";
    private static final int NOTIFICATION_ID = 101;
    private LocationManager locationManager;
    private UsageTracker usageTracker;
    private Handler handler;
    private Runnable heartbeat;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(NOTIFICATION_ID, notification());
        
        handler = new Handler(Looper.getMainLooper());
        usageTracker = new UsageTracker(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        
        try {
            // Update location every 2 minutes (120000ms)
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 120000, 0, this);
        } catch (SecurityException e) {
            Log.e("FMK_Tracking", "Missing location permission", e);
            stopSelf();
        }

        // Heartbeat to push data even if location hasn't changed
        heartbeat = new Runnable() {
            @Override
            public void run() {
                pushLatestData();
                handler.postDelayed(this, 120000);
            }
        };
        handler.post(heartbeat);
    }

    private void pushLatestData() {
        try {
            Location lastLoc = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            if (lastLoc != null) {
                String usage = usageTracker.getUsageData();
                String jsonData = String.format("{\"lat\":%f,\"lng\":%f,\"usage\":%s}", lastLoc.getLatitude(), lastLoc.getLongitude(), usage);
                MainActivity.pushDataToWebView(jsonData);
            }
        } catch (SecurityException e) {
            Log.e("FMK_Tracking", "Security error in heartbeat", e);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY; // Restart if killed
    }

    // Unkillable Service logic
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        Intent restartServiceIntent = new Intent(getApplicationContext(), this.getClass());
        restartServiceIntent.setPackage(getPackageName());
        startService(restartServiceIntent);
        super.onTaskRemoved(rootIntent);
    }

    @Override
    public void onLocationChanged(Location location) {
        String usage = usageTracker.getUsageData();
        String jsonData = String.format("{\"lat\":%f,\"lng\":%f,\"usage\":%s}", location.getLatitude(), location.getLongitude(), usage);
        MainActivity.pushDataToWebView(jsonData);
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}

    private Notification notification() {
        return new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("Find My Kid is active")
                .setContentText("Location tracking is running in background.")
                .setOngoing(true).build();
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CHANNEL_ID, "FMK Tracking", NotificationManager.IMPORTANCE_LOW);
            NotificationManager m = getSystemService(NotificationManager.class);
            if (m != null) m.createNotificationChannel(c);
        }
    }

    @Override
    public void onDestroy() {
        if (locationManager != null) locationManager.removeUpdates(this);
        if (handler != null) handler.removeCallbacks(heartbeat);
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
