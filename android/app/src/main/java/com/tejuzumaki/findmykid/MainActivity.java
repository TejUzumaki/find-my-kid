package com.tejuzumaki.findmykid;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

public class MainActivity extends Activity {
    private static final int REQ_LOCATION = 1001;
    private static WebView webView;
    private static String latestData = "{\"lat\":0.0,\"lng\":0.0,\"usage\":\"Acquiring...\"}";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestEssentialPermissions();
        
        // Setup WebView immediately so UI loads, but wait for permission to start service
        webView = new WebView(this);
        setContentView(webView);
        
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setMediaPlaybackRequiresUserGesture(false);
        webView.addJavascriptInterface(new WebAppInterface(this), "AndroidBridge");
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/findmykid.html");
        webView.setKeepScreenOn(true);
    }

    private void startTrackingService() {
        Intent intent = new Intent(this, TrackingService.class);
        if (Build.VERSION.SDK_INT >= 26) startForegroundService(intent);
        else startService(intent);
    }

    public static void pushDataToWebView(String jsonData) {
        latestData = jsonData;
        if (webView != null) {
            webView.post(() -> webView.evaluateJavascript("updateChildData('" + jsonData.replace("'", "\\'") + "')", null));
        }
    }

    public static class WebAppInterface {
        private final Activity activity;
        WebAppInterface(Activity a) { activity = a; }

        @JavascriptInterface
        public void getLatestData() {
            activity.runOnUiThread(() -> webView.evaluateJavascript("updateChildData('" + latestData.replace("'", "\\'") + "')", null));
        }

        @JavascriptInterface
        public boolean verifyPin(String pin) {
            AppLockManager lock = new AppLockManager(activity);
            if (!lock.isPinSet()) { return pin.equals("0000"); }
            return lock.verifyPin(pin);
        }

        @JavascriptInterface
        public void stopTracking() {
            activity.stopService(new Intent(activity, TrackingService.class));
            activity.finish();
        }
    }

    private void requestEssentialPermissions() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
        } else {
            // Permission already granted, start service safely
            startTrackingService();
        }
        if (!hasUsageStatsPermission()) {
            Toast.makeText(this, "Please grant Usage Access for full tracking", Toast.LENGTH_LONG).show();
            startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS));
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                // User just granted permission! Now we can safely start the FGS.
                startTrackingService();
                Toast.makeText(this, "Tracking Started", Toast.LENGTH_SHORT).show();
            } else {
                Toast.makeText(this, "Location permission is required for tracking", Toast.LENGTH_LONG).show();
            }
        }
    }

    private boolean hasUsageStatsPermission() {
        try {
            android.app.usage.UsageStatsManager usm = (android.app.usage.UsageStatsManager) getSystemService(USAGE_STATS_SERVICE);
            long time = System.currentTimeMillis();
            java.util.List<android.app.usage.UsageStats> stats = usm.queryUsageStats(android.app.usage.UsageStatsManager.INTERVAL_DAILY, time - 1000, time);
            return stats != null && !stats.isEmpty();
        } catch (Exception e) { return false; }
    }
}
