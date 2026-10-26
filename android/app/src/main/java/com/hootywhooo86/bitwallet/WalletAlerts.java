package com.hootywhooo86.bitwallet;

import android.content.ComponentName;
import android.content.Intent;
import android.provider.Settings;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

/** Bridge between PayCatcher and the web app: status, settings shortcut, and the queue of caught payments. */
@CapacitorPlugin(name = "WalletAlerts")
public class WalletAlerts extends Plugin {

    @Override
    public void load() {
        PayCatcher.onNew = () -> getActivity().runOnUiThread(() -> notifyListeners("alert", new JSObject()));
    }

    @PluginMethod
    public void status(PluginCall call) {
        boolean on = NotificationManagerCompat.getEnabledListenerPackages(getContext()).contains(getContext().getPackageName());
        JSObject r = new JSObject();
        r.put("enabled", on);
        call.resolve(r);
    }

    @PluginMethod
    public void openSettings(PluginCall call) {
        Intent i;
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            i = new Intent(Settings.ACTION_NOTIFICATION_LISTENER_DETAIL_SETTINGS);
            i.putExtra(Settings.EXTRA_NOTIFICATION_LISTENER_COMPONENT_NAME, new ComponentName(getContext(), PayCatcher.class).flattenToString());
        } else {
            i = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(i);
        } catch (Exception e) {
            Intent all = new Intent("android.settings.ACTION_NOTIFICATION_LISTENER_SETTINGS");
            all.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(all);
        }
        call.resolve();
    }

    @PluginMethod
    public void drain(PluginCall call) {
        JSONArray q = PayCatcher.drain(getContext());
        JSObject r = new JSObject();
        try { r.put("alerts", new JSArray(q.toString())); } catch (Exception e) { r.put("alerts", new JSArray()); }
        call.resolve(r);
    }

    @Override
    protected void handleOnDestroy() {
        PayCatcher.onNew = null;
    }
}
