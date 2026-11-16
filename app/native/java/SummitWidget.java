package io.github.taskrti76.dvatisocaki;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.view.View;
import android.widget.RemoteViews;

/** Home-screen widget "Potrdi vrh" (4×2). Tap anywhere = one GPS fix -> nearest summit -> confirmed (or saved until there is signal). */
public class SummitWidget extends AppWidgetProvider {
  protected int layout() { return R.layout.summit_widget; }

  @Override public void onUpdate(Context c, AppWidgetManager m, int[] ids) { for (int id : ids) m.updateAppWidget(id, views(c, layout())); }

  static RemoteViews views(Context c, int layout) {
    SharedPreferences s = WidgetStore.sp(c);
    boolean on = WidgetStore.on(c);
    String kind = on ? s.getString("kind", "idle") : "off";
    String label, name, line, pill;
    if (!on) {
      label = WidgetStore.t(c, "Izklopljeno", "Off"); name = WidgetStore.t(c, "Potrdi vrh", "Confirm summit");
      line = WidgetStore.t(c, "Vklopi v aplikaciji: Nastavitve → Pripomoček", "Turn on in the app: Settings → Widget"); pill = "";
    } else if (!s.contains("kind")) {
      label = WidgetStore.t(c, "Potrdi vrh", "Confirm summit"); name = WidgetStore.t(c, "Tapni markacijo", "Tap the blaze");
      line = WidgetStore.t(c, "na vrhu, do 80 m od njega", "on the summit, within 80 m"); pill = "";
    } else {
      label = s.getString("label", ""); name = s.getString("name", ""); line = s.getString("line", ""); pill = s.getString("pill", "");
    }
    RemoteViews v = new RemoteViews(c.getPackageName(), layout);
    v.setTextViewText(R.id.w_label, label);
    v.setTextViewText(R.id.w_name, name);
    v.setTextViewText(R.id.w_line, line);
    v.setTextViewText(R.id.w_pill, pill);
    v.setViewVisibility(R.id.w_pill, pill.isEmpty() || layout != R.layout.summit_widget ? View.GONE : View.VISIBLE);
    int blaze = "ok".equals(kind) ? R.drawable.w_blaze_ok : "busy".equals(kind) ? R.drawable.w_blaze_busy : "off".equals(kind) ? R.drawable.w_blaze_off : R.drawable.w_blaze;
    v.setImageViewResource(R.id.w_blaze, blaze);
    v.setInt(R.id.w_root, "setBackgroundResource", "ok".equals(kind) ? R.drawable.w_bg_ok : "off".equals(kind) ? R.drawable.w_bg_off : R.drawable.w_bg);
    v.setInt(R.id.w_label, "setTextColor", "ok".equals(kind) ? 0xFFC8102E : c.getResources().getColor(R.color.w_mute));
    Intent i = new Intent(c, VerifyActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_ANIMATION);
    PendingIntent pi = PendingIntent.getActivity(c, 1, i, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    v.setOnClickPendingIntent(R.id.w_root, pi);
    return v;
  }

  static void updateAll(Context c) {
    AppWidgetManager m = AppWidgetManager.getInstance(c);
    for (int id : m.getAppWidgetIds(new ComponentName(c, SummitWidget.class))) m.updateAppWidget(id, views(c, R.layout.summit_widget));
    for (int id : m.getAppWidgetIds(new ComponentName(c, SummitWidgetSmall.class))) m.updateAppWidget(id, views(c, R.layout.summit_widget_small));
  }
}
