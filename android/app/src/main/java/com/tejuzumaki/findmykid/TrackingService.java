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
import android.util.Log;

public class TrackingService extends Service implements LocationListener {
    private static final String CHANNEL_ID = "fmk_tracking";
    private static final int NOTIFICATION_ID = 101;
    private LocationManager locationManager;
    private UsageTracker usageTracker;

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
        startForeground(NOTIFICATION_ID, notification());
        
        usageTracker = new UsageTracker(this);
        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        try {
            locationManager.requestLocationUpdates(LocationManager.GPS_PROVIDER, 5000, 0, this);
        } catch (SecurityException e) {
            Log.e("FMK_Tracking", "Missing location permission", e);
            stopSelf();
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public void onLocationChanged(Location location) {
        String usage = usageTracker.getUsageData();
        String safeUsage = usage.replace("\"", "'");
        String jsonData = String.format("{\"lat\":%f,\"lng\":%f,\"usage\":\"%s\"}", location.getLatitude(), location.getLongitude(), safeUsage);
        MainActivity.pushDataToWebView(jsonData);
    }

    @Override public void onStatusChanged(String provider, int status, Bundle extras) {}
    @Override public void onProviderEnabled(String provider) {}
    @Override public void onProviderDisabled(String provider) {}

    private Notification notification() {
        return new Notification.Builder(this, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                .setContentTitle("Find My Kid is active")
                .setContentText("Location tracking is running.")
                .setOngoing(true)
                .build();
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
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
