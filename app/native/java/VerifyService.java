package io.github.taskrti76.dvatisocaki;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

/**
 * One GPS fix for the widget (at most 30 s; stops early at ±20 m). Then: nearest summit from the app's own peak list.
 * Within 80 m (and ±60 m or better) the fix is queued and UploadWorker sends it as soon as there is signal - now or later,
 * also after a restart. Further away: the widget shows the nearest summit, its distance and direction.
 */
public class VerifyService extends Service {
  private static final int FG = 4711;
  private LocationManager lm; private final Handler h = new Handler(Looper.getMainLooper());
  private Location best; private boolean done, started;
  private final LocationListener ll = new LocationListener() {
    @Override public void onLocationChanged(Location l) {
      if (best == null || l.getAccuracy() < best.getAccuracy()) best = l;
      Context c = VerifyService.this;
      WidgetStore.show(c, "busy", WidgetStore.t(c, "Iščem GPS …", "Getting GPS …"), WidgetStore.sp(c).getString("name", "…"),
        WidgetStore.t(c, "natančnost ±", "accuracy ±") + Math.round(best.getAccuracy()) + " m", "");
      if (best.getAccuracy() <= 20) finishWith(best);
    }
    @Override public void onStatusChanged(String p, int s, Bundle e) {}
    @Override public void onProviderEnabled(String p) {}
    @Override public void onProviderDisabled(String p) {}
  };

  @Override public IBinder onBind(Intent i) { return null; }

  @Override public int onStartCommand(Intent intent, int flags, int id) {
    if (started) return START_NOT_STICKY; started = true;
    Notification n = fgNote();
    try {
      if (Build.VERSION.SDK_INT >= 29) startForeground(FG, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION); else startForeground(FG, n);
    } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
    WidgetStore.show(this, "busy", WidgetStore.t(this, "Iščem GPS …", "Getting GPS …"), WidgetStore.sp(this).getString("name", "…"),
      WidgetStore.t(this, "počakaj na prostem", "wait outdoors"), "");
    lm = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    try {
      if (lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) lm.requestLocationUpdates(LocationManager.GPS_PROVIDER, 1000, 0, ll, Looper.getMainLooper());
      if (lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) lm.requestLocationUpdates(LocationManager.NETWORK_PROVIDER, 2000, 0, ll, Looper.getMainLooper());
    } catch (SecurityException e) { finishWith(null); return START_NOT_STICKY; }
    h.postDelayed(() -> { if (best != null && best.getAccuracy() <= 60) finishWith(best); }, 12000);
    h.postDelayed(() -> finishWith(best), 30000);
    return START_NOT_STICKY;
  }

  private Notification fgNote() {
    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel("summit_gps") == null)
      nm.createNotificationChannel(new NotificationChannel("summit_gps", WidgetStore.t(this, "Iskanje lokacije", "Getting location"), NotificationManager.IMPORTANCE_LOW));
    return new NotificationCompat.Builder(this, "summit_gps").setSmallIcon(R.drawable.ic_tracking).setColor(0xFFC8102E)
      .setContentTitle(WidgetStore.t(this, "Potrdi vrh", "Confirm summit")).setContentText(WidgetStore.t(this, "Iščem GPS …", "Getting GPS …"))
      .setOngoing(true).setPriority(NotificationCompat.PRIORITY_LOW).build();
  }

  private void finishWith(Location l) {
    if (done) return; done = true;
    h.removeCallbacksAndMessages(null);
    try { if (lm != null) lm.removeUpdates(ll); } catch (Exception ignored) {}
    Context c = this;
    try {
      if (l == null) {
        WidgetStore.show(c, "far", WidgetStore.t(c, "Ni GPS signala", "No GPS fix"), WidgetStore.sp(c).getString("name", "…"),
          WidgetStore.t(c, "poskusi na prostem, z vklopljeno lokacijo", "try outdoors with location on"), "");
        return;
      }
      JSONObject n = WidgetStore.nearest(c, l.getLatitude(), l.getLongitude());
      if (n == null) { WidgetStore.show(c, "far", WidgetStore.t(c, "Ni vrha v bližini", "No summit nearby"), "–", "", ""); return; }
      String name = n.optString("name"); double d = n.optDouble("d");
      if (l.getAccuracy() > 60) {
        WidgetStore.show(c, "far", WidgetStore.t(c, "GPS ni dovolj natančen", "GPS not precise enough"), name,
          "±" + Math.round(l.getAccuracy()) + " m · " + WidgetStore.t(c, "rabim ±60 m", "needs ±60 m"), WidgetStore.t(c, "Tapni znova na prostem", "Tap again outdoors"));
        return;
      }
      if (d > 80) {
        String line = WidgetStore.t(c, "najbližji · ", "nearest · ") + WidgetStore.km(c, d) + " · " + WidgetStore.dir(c, n.optDouble("brg"));
        WidgetStore.show(c, "far", WidgetStore.t(c, "Ni vrha v bližini", "No summit nearby"), name, line, WidgetStore.t(c, "Vrh potrdiš do 80 m", "Confirm within 80 m"));
        WidgetStore.notify(c, 4801, WidgetStore.t(c, "Ni vrha v bližini", "No summit nearby"),
          WidgetStore.t(c, "Najbližji je " + name + ", " + WidgetStore.km(c, d) + " proti " + WidgetStore.dir(c, n.optDouble("brg")) + ". Potrdiš ga do 80 m od vrha.",
            "Nearest is " + name + ", " + WidgetStore.km(c, d) + " to the " + WidgetStore.dir(c, n.optDouble("brg")) + ". Confirm within 80 m of the top."));
        return;
      }
      long at = l.getTime() > 0 ? l.getTime() : System.currentTimeMillis();
      JSONObject q = new JSONObject();
      q.put("lat", l.getLatitude()).put("lon", l.getLongitude()).put("acc", Math.round(l.getAccuracy())).put("at", WidgetStore.iso(at))
        .put("id", n.optString("id")).put("name", name).put("d", Math.round(d));
      WidgetStore.push(c, q);
      WidgetStore.show(c, "queued", WidgetStore.t(c, "Pošiljam …", "Sending …"), name, Math.round(d) + WidgetStore.t(c, " m od vrha · ", " m from the top · ") + WidgetStore.hm(at),
        WidgetStore.t(c, "Pošljem, ko bo signal", "Sent when there is signal"));
      UploadWorker.enqueue(c);
    } catch (Exception e) {
      WidgetStore.idle(c);
    } finally {
      stopForeground(true); stopSelf();
    }
  }

  @Override public void onDestroy() { h.removeCallbacksAndMessages(null); try { if (lm != null) lm.removeUpdates(ll); } catch (Exception ignored) {} super.onDestroy(); }
}
