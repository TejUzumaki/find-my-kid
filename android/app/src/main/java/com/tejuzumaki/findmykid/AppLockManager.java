package com.tejuzumaki.findmykid;

import android.content.Context;
import android.content.SharedPreferences;

public class AppLockManager {
    private final SharedPreferences prefs;
    public AppLockManager(Context context) {
        prefs = context.getSharedPreferences("FMK_PREFS", Context.MODE_PRIVATE);
    }
    public boolean isPinSet() { return prefs.contains("APP_PIN"); }
    public void setPin(String pin) { prefs.edit().putString("APP_PIN", pin).apply(); }
    public boolean verifyPin(String pin) { return pin.equals(prefs.getString("APP_PIN", "")); }
}
