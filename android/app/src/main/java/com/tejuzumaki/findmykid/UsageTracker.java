package com.tejuzumaki.findmykid;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;

public class UsageTracker {
    private final UsageStatsManager usageStatsManager;
    private final PackageManager packageManager;
    private final String launcherPackage;

    public UsageTracker(Context context) {
        usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
        packageManager = context.getPackageManager();
        
        // Find the default launcher package name to filter it out
        Intent intent = new Intent(Intent.ACTION_MAIN);
        intent.addCategory(Intent.CATEGORY_HOME);
        launcherPackage = intent.resolveActivity(packageManager) != null ? 
            intent.resolveActivity(packageManager).getPackageName() : "";
    }

    public String getUsageData() {
        long endTime = System.currentTimeMillis();
        long startTime = endTime - (1000 * 60 * 60 * 24); // Last 24 hours
        
        List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
        if (stats == null || stats.isEmpty()) return "[]";
        
        List<UsageStats> filtered = new ArrayList<>();
        for (UsageStats stat : stats) {
            long time = stat.getTotalTimeInForeground();
            String pkg = stat.getPackageName();
            
            // Filter: > 1 min, not system UI, not launcher
            if (time > 60000 && !pkg.equals(launcherPackage) && !pkg.contains("android")) {
                filtered.add(stat);
            }
        }
        
        // Sort by most used
        Collections.sort(filtered, new Comparator<UsageStats>() {
            @Override
            public int compare(UsageStats a, UsageStats b) {
                return Long.compare(b.getTotalTimeInForeground(), a.getTotalTimeInForeground());
            }
        });
        
        JSONArray arr = new JSONArray();
        for (UsageStats stat : filtered) {
            try {
                JSONObject obj = new JSONObject();
                ApplicationInfo ai = packageManager.getApplicationInfo(stat.getPackageName(), 0);
                String appName = (String) packageManager.getApplicationLabel(ai);
                
                long minutes = stat.getTotalTimeInForeground() / 60000;
                long hours = minutes / 60;
                long mins = minutes % 60;
                String timeStr = hours > 0 ? hours + "h " + mins + "m" : mins + "m";
                
                obj.put("app", appName);
                obj.put("timeStr", timeStr);
                obj.put("minutes", minutes); // Keep for chart scaling
                arr.put(obj);
            } catch (Exception e) {
                // Ignore if app name can't be found
            }
        }
        return arr.toString();
    }
}
