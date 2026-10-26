package com.hootywhooo86.bitwallet;

import android.app.Notification;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Watches for payment notifications from bank and wallet apps (RBC, Google Wallet...) and queues
 * them for bitwallet to log. Only these apps are read; everything else is ignored right here.
 */
public class PayCatcher extends NotificationListenerService {

    static final Set<String> APPS = new HashSet<>(Arrays.asList(
        "com.rbc.mobile.android",               // RBC Mobile
        "com.google.android.apps.walletnfcrel", // Google Wallet
        "com.samsung.android.spay",             // Samsung Wallet
        "com.td",                               // TD
        "com.cibc.android.mobi",                // CIBC
        "com.bmo.mobile",                       // BMO
        "com.scotiabank.banking"                // Scotiabank
    ));
    static final String PREFS = "paycatcher";
    static final int MAX = 300;
    static Runnable onNew;

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || !APPS.contains(sbn.getPackageName())) return;
        Bundle x = sbn.getNotification().extras;
        if (x == null) return;
        String title = str(x.getCharSequence(Notification.EXTRA_TITLE));
        String text = str(x.getCharSequence(Notification.EXTRA_BIG_TEXT));
        if (text.isEmpty()) text = str(x.getCharSequence(Notification.EXTRA_TEXT));
        if (!(title + text).contains("$")) return; // only money notifications
        save(this, sbn.getPackageName(), sbn.getKey() + "|" + sbn.getPostTime(), title, text, sbn.getPostTime());
        Runnable r = onNew;
        if (r != null) r.run();
    }

    private static String str(CharSequence c) {
        return c == null ? "" : c.toString().trim();
    }

    static synchronized void save(Context ctx, String pkg, String key, String title, String text, long time) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        try {
            JSONArray q = new JSONArray(p.getString("queue", "[]"));
            for (int i = 0; i < q.length(); i++) if (key.equals(q.getJSONObject(i).optString("key"))) return;
            JSONObject o = new JSONObject();
            o.put("key", key).put("pkg", pkg).put("title", title).put("text", text).put("time", time);
            q.put(o);
            while (q.length() > MAX) q.remove(0);
            p.edit().putString("queue", q.toString()).apply();
        } catch (Exception ignored) {}
    }

    static synchronized JSONArray drain(Context ctx) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS, MODE_PRIVATE);
        JSONArray q;
        try { q = new JSONArray(p.getString("queue", "[]")); } catch (Exception e) { q = new JSONArray(); }
        p.edit().putString("queue", "[]").apply();
        return q;
    }
}
