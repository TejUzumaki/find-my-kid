package com.tejuzumaki.findmykid;

import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.List;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;

public class UsageTracker {
    private final UsageStatsManager usageStatsManager;

    public UsageTracker(Context context) {
        usageStatsManager = (UsageStatsManager) context.getSystemService(Context.USAGE_STATS_SERVICE);
    }

    public String getUsageData() {
        long endTime = System.currentTimeMillis();
        long startTime = endTime - (1000 * 60 * 60 * 24); // Last 24 hours
        
        List<UsageStats> stats = usageStatsManager.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startTime, endTime);
        if (stats == null || stats.isEmpty()) return "[]";
        
        // Filter apps used for > 1 min
        List<UsageStats> filtered = new ArrayList<>();
        for (UsageStats stat : stats) {
            if (stat.getTotalTimeInForeground() > 60000) {
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
        
        // Build JSON Array
        JSONArray arr = new JSONArray();
        for (UsageStats stat : filtered) {
            try {
                JSONObject obj = new JSONObject();
                obj.put("app", stat.getPackageName());
                obj.put("minutes", stat.getTotalTimeInForeground() / 60000);
                arr.put(obj);
            } catch (Exception e) {
                // Ignore
            }
        }
        return arr.toString();
    }
}
