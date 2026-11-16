package io.github.taskrti76.dvatisocaki;

import android.Manifest;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

/** The page's side of the widget (account.js, Nastavitve → Pripomoček): switch on with a widget key, switch off, status, add to the home screen. */
@CapacitorPlugin(name = "SummitWidget", permissions = {
  @Permission(alias = "location", strings = {Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}),
  @Permission(alias = "notifications", strings = {"android.permission.POST_NOTIFICATIONS"})
})
public class WidgetBridge extends Plugin {
  private JSObject state() {
    JSObject r = new JSObject();
    r.put("enabled", WidgetStore.on(getContext()));
    r.put("pending", WidgetStore.queue(getContext()).length());
    r.put("location", getPermissionState("location") == PermissionState.GRANTED);
    r.put("notifications", Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED);
    AppWidgetManager m = AppWidgetManager.getInstance(getContext());
    r.put("placed", m.getAppWidgetIds(new ComponentName(getContext(), SummitWidget.class)).length + m.getAppWidgetIds(new ComponentName(getContext(), SummitWidgetSmall.class)).length);
    return r;
  }

  @PluginMethod public void status(PluginCall call) { call.resolve(state()); }

  @PluginMethod public void enable(PluginCall call) {
    String key = call.getString("key"), url = call.getString("url"), api = call.getString("apikey");
    if (key == null || url == null || api == null) { call.reject("missing key / url / apikey"); return; }
    WidgetStore.sp(getContext()).edit().putString("key", key).putString("url", url).putString("apikey", api)
      .putString("lang", call.getString("lang", "sl")).putBoolean("enabled", true).remove("kind").apply();
    WidgetStore.idle(getContext());
    boolean loc = getPermissionState("location") == PermissionState.GRANTED;
    boolean not = Build.VERSION.SDK_INT < 33 || getPermissionState("notifications") == PermissionState.GRANTED;
    if (loc && not) { call.resolve(state()); return; }
    requestPermissionForAliases(Build.VERSION.SDK_INT >= 33 ? new String[]{"location", "notifications"} : new String[]{"location"}, call, "permsDone");
  }

  @PermissionCallback private void permsDone(PluginCall call) { call.resolve(state()); }

  @PluginMethod public void disable(PluginCall call) {
    String key = WidgetStore.sp(getContext()).getString("key", null);
    WidgetStore.sp(getContext()).edit().remove("key").putBoolean("enabled", false).putString("queue", "[]").apply();
    SummitWidget.updateAll(getContext());
    JSObject r = state(); r.put("key", key); call.resolve(r);
  }

  @PluginMethod public void pin(PluginCall call) {
    JSObject r = new JSObject(); boolean ok = false;
    try {
      AppWidgetManager m = AppWidgetManager.getInstance(getContext());
      if (Build.VERSION.SDK_INT >= 26 && m.isRequestPinAppWidgetSupported())
        ok = m.requestPinAppWidget(new ComponentName(getContext(), call.getBoolean("small", false) ? SummitWidgetSmall.class : SummitWidget.class), null, null);
    } catch (Exception ignored) {}
    r.put("ok", ok); call.resolve(r);
  }
}
