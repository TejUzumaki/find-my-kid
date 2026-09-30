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

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private static final int REQ_LOCATION = 1001;
    private static WebView webView;
    private static String latestData = "{\"lat\":0.0,\"lng\":0.0,\"usage\":\"Acquiring...\"}";

    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestEssentialPermissions();
        
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
            // Escape newlines so it doesn't break JS syntax
            String safeJson = jsonData.replace("\n", "\\n").replace("\r", "\\r");
            webView.post(() -> webView.evaluateJavascript("updateChildData(" + safeJson + ")", null));
        }
    }

    public static class WebAppInterface {
        private final Activity activity;
        WebAppInterface(Activity a) { activity = a; }

        @JavascriptInterface
        public void getLatestData() {
            String safeJson = latestData.replace("\n", "\\n").replace("\r", "\\r");
            activity.runOnUiThread(() -> webView.evaluateJavascript("updateChildData(" + safeJson + ")", null));
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

        // Native HTTP call to Vercel to bypass WebView CORS
        @JavascriptInterface
        public void registerCode(String code, String peerId) {
            new Thread(() -> {
                try {
                    URL url = new URL("https://fmkxtej.vercel.app/api/peer-map");
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json; utf-8");
                    conn.setDoOutput(true);
                    String jsonInputString = String.format("{\"shortCode\":\"%s\",\"peerId\":\"%s\"}", code, peerId);
                    try(OutputStream os = conn.getOutputStream()) {
                        byte[] input = jsonInputString.getBytes(StandardCharsets.UTF_8);
                        os.write(input, 0, input.length);
                    }
                    int responseCode = conn.getResponseCode();
                    activity.runOnUiThread(() -> webView.evaluateJavascript("addDebugLog('Vercel API registered: " + responseCode + "')", null));
                    conn.disconnect();
                } catch (Exception e) {
                    activity.runOnUiThread(() -> webView.evaluateJavascript("addDebugLog('Vercel Error: " + e.getMessage().replace("'", "\\'") + "')", null));
                }
            }).start();
        }
    }

    private void requestEssentialPermissions() {
        if (checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, REQ_LOCATION);
        } else {
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
                startTrackingService();
            } else {
                Toast.makeText(this, "Location permission is required", Toast.LENGTH_LONG).show();
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
