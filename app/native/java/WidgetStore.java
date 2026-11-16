package io.github.taskrti76.dvatisocaki;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.InputStream;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/** Home-screen widget "Potrdi vrh": saved settings, what the widget shows, the queue of fixes waiting for signal, peaks, notifications. */
final class WidgetStore {
  static final String P = "summit_widget", CH = "summit_widget";
  private WidgetStore() {}

  static SharedPreferences sp(Context c) { return c.getSharedPreferences(P, Context.MODE_PRIVATE); }
  static boolean en(Context c) { return "en".equals(sp(c).getString("lang", "sl")); }
  static String t(Context c, String sl, String en) { return en(c) ? en : sl; }
  static boolean on(Context c) { SharedPreferences s = sp(c); return s.getBoolean("enabled", false) && s.getString("key", null) != null; }

  /** kind: idle · busy · ok · queued · far · off */
  static void show(Context c, String kind, String label, String name, String line, String pill) {
    sp(c).edit().putString("kind", kind).putString("label", label).putString("name", name).putString("line", line).putString("pill", pill == null ? "" : pill).apply();
    SummitWidget.updateAll(c);
  }
  static void idle(Context c) {
    show(c, "idle", t(c, "Potrdi vrh", "Confirm summit"), t(c, "Tapni markacijo", "Tap the blaze"), t(c, "na vrhu, do 80 m od njega", "on the summit, within 80 m"), "");
  }

  // ---------- queue (fixes waiting for signal) ----------
  static synchronized JSONArray queue(Context c) {
    try { return new JSONArray(sp(c).getString("queue", "[]")); } catch (Exception e) { return new JSONArray(); }
  }
  static synchronized void setQueue(Context c, JSONArray a) { sp(c).edit().putString("queue", a.toString()).apply(); }
  static synchronized void push(Context c, JSONObject o) { JSONArray a = queue(c); a.put(o); while (a.length() > 30) a.remove(0); setQueue(c, a); }

  // ---------- peaks (assets/summits.json: [[id, name, elev, lat, lon], …], made by the Android Action) ----------
  private static JSONArray PEAKS;
  static synchronized JSONArray peaks(Context c) {
    if (PEAKS != null) return PEAKS;
    try (InputStream in = c.getAssets().open("summits.json")) {
      byte[] b = new byte[in.available()]; int n = 0, r; while (n < b.length && (r = in.read(b, n, b.length - n)) > 0) n += r;
      PEAKS = new JSONArray(new String(b, 0, n, "UTF-8"));
    } catch (Exception e) { PEAKS = new JSONArray(); }
    return PEAKS;
  }
  /** nearest peak: {id, name, elev, d (m), brg (°)} or null */
  static JSONObject nearest(Context c, double la, double lo) {
    JSONArray P = peaks(c); JSONObject best = null; double bd = 1e12;
    for (int i = 0; i < P.length(); i++) {
      JSONArray p = P.optJSONArray(i); if (p == null) continue;
      double d = dist(la, lo, p.optDouble(3), p.optDouble(4)); if (d < bd) { bd = d; best = new JSONObject(); try {
        best.put("id", p.optString(0)).put("name", p.optString(1)).put("elev", p.optDouble(2)).put("d", d).put("brg", bearing(la, lo, p.optDouble(3), p.optDouble(4)));
      } catch (Exception ignored) {} }
    }
    return best;
  }
  static double dist(double a, double b, double c2, double d) {
    double r = Math.PI / 180, x = Math.pow(Math.sin((c2 - a) * r / 2), 2) + Math.cos(a * r) * Math.cos(c2 * r) * Math.pow(Math.sin((d - b) * r / 2), 2);
    return 12742000 * Math.asin(Math.sqrt(x));
  }
  static double bearing(double a, double b, double c2, double d) {
    double r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c2 * r), x = Math.cos(a * r) * Math.sin(c2 * r) - Math.sin(a * r) * Math.cos(c2 * r) * Math.cos((d - b) * r);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  static String dir(Context c, double brg) {
    String[] sl = {"S", "SV", "V", "JV", "J", "JZ", "Z", "SZ"}, en = {"N", "NE", "E", "SE", "S", "SW", "W", "NW"};
    int i = (int) Math.round(brg / 45) % 8; return en(c) ? en[i] : sl[i];
  }
  static String km(Context c, double m) {
    return m < 1000 ? Math.round(m) + " m" : String.format(Locale.US, "%.1f km", m / 1000).replace('.', en(c) ? '.' : ',');
  }
  static String iso(long t) { SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US); f.setTimeZone(TimeZone.getTimeZone("UTC")); return f.format(new Date(t)); }
  static long parseIso(String s) { try { SimpleDateFormat f = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US); f.setTimeZone(TimeZone.getTimeZone("UTC")); return f.parse(s).getTime(); } catch (Exception e) { return System.currentTimeMillis(); } }
  static String hm(long t) { return new SimpleDateFormat("HH:mm", Locale.US).format(new Date(t)); }

  // ---------- notifications ----------
  static void notify(Context c, int id, String title, String body) {
    try {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CH) == null)
        nm.createNotificationChannel(new NotificationChannel(CH, t(c, "Potrditev vrha", "Summit confirmation"), NotificationManager.IMPORTANCE_DEFAULT));
      Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
      PendingIntent pi = PendingIntent.getActivity(c, 7, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
      NotificationCompat.Builder b = new NotificationCompat.Builder(c, CH).setSmallIcon(R.drawable.ic_tracking).setColor(0xFFC8102E)
        .setContentTitle(title).setContentText(body).setStyle(new NotificationCompat.BigTextStyle().bigText(body)).setAutoCancel(true).setContentIntent(pi);
      NotificationManagerCompat.from(c).notify(id, b.build());
    } catch (SecurityException ignored) { /* notifications not allowed */ }
  }
}
