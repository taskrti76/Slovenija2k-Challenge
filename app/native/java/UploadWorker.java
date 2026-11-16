package io.github.taskrti76.dvatisocaki;

import android.content.Context;
import androidx.annotation.NonNull;
import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.ExistingWorkPolicy;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.TimeUnit;

/** Sends the queued widget fixes to the server (widget_verify, supabase/10_widget.sql) once there is a connection; retries until it works. */
public class UploadWorker extends Worker {
  public UploadWorker(@NonNull Context c, @NonNull WorkerParameters p) { super(c, p); }

  static void enqueue(Context c) {
    OneTimeWorkRequest w = new OneTimeWorkRequest.Builder(UploadWorker.class)
      .setConstraints(new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build();
    WorkManager.getInstance(c).enqueueUniqueWork("summit_upload", ExistingWorkPolicy.APPEND_OR_REPLACE, w);
  }

  @NonNull @Override public Result doWork() {
    Context c = getApplicationContext();
    String key = WidgetStore.sp(c).getString("key", null), url = WidgetStore.sp(c).getString("url", null), api = WidgetStore.sp(c).getString("apikey", null);
    JSONArray q = WidgetStore.queue(c), keep = new JSONArray();
    if (q.length() == 0) return Result.success();
    if (key == null || url == null || api == null) { WidgetStore.setQueue(c, keep); return Result.success(); }
    boolean retry = false;
    for (int i = 0; i < q.length(); i++) {
      JSONObject o = q.optJSONObject(i); if (o == null) continue;
      try {
        JSONObject body = new JSONObject().put("k", key).put("lat", o.optDouble("lat")).put("lon", o.optDouble("lon")).put("acc", o.optDouble("acc")).put("at", o.optString("at"));
        JSONObject r = post(url + "/rest/v1/rpc/widget_verify", api, body.toString());
        long at = WidgetStore.parseIso(o.optString("at")); boolean late = System.currentTimeMillis() - at > 5 * 60 * 1000;
        if (r.optBoolean("ok")) {
          String name = r.optString("name", o.optString("name"));
          WidgetStore.show(c, "ok", WidgetStore.t(c, "Potrjeno", "Confirmed"), name, r.optInt("d") + WidgetStore.t(c, " m od vrha · ", " m from the top · ") + WidgetStore.hm(at),
            "✓ " + r.optInt("n") + " / 98");
          WidgetStore.notify(c, 4800 + (int) (at / 1000 % 1000), "✓ " + name + WidgetStore.t(c, " potrjen", " confirmed") + (late ? WidgetStore.t(c, " (poslano kasneje)", " (sent later)") : ""),
            late ? WidgetStore.t(c, "Shranjeno na vrhu ob " + WidgetStore.hm(at) + ", poslano, ko je bil signal.", "Saved on the top at " + WidgetStore.hm(at) + ", sent when there was signal.")
                 : r.optInt("d") + WidgetStore.t(c, " m od vrha ob ", " m from the top at ") + WidgetStore.hm(at) + " · " + r.optInt("n") + WidgetStore.t(c, " od 98 osvojenih", " of 98 climbed"));
        } else {
          String why = r.optString("why");
          if ("key".equals(why)) {
            WidgetStore.sp(c).edit().putBoolean("enabled", false).apply();
            WidgetStore.notify(c, 4802, WidgetStore.t(c, "Pripomoček je treba znova vklopiti", "Turn the widget on again"),
              WidgetStore.t(c, "V aplikaciji: Nastavitve → Pripomoček.", "In the app: Settings → Widget."));
            SummitWidget.updateAll(c);
          } else {
            String name = r.optString("name", o.optString("name"));
            WidgetStore.show(c, "far", WidgetStore.t(c, "Ni potrjeno", "Not confirmed"), name, why.equals("far") ? WidgetStore.km(c, r.optDouble("d")) + WidgetStore.t(c, " od vrha", " from the top") : why, "");
            WidgetStore.notify(c, 4803, WidgetStore.t(c, "Vrh ni potrjen", "Summit not confirmed"), name + " · " + why);
          }
        }
      } catch (IOException e) { keep.put(o); retry = true; }
      catch (Exception e) { /* bad answer: drop this one */ }
    }
    WidgetStore.setQueue(c, keep);
    return retry ? Result.retry() : Result.success();
  }

  private static JSONObject post(String url, String api, String body) throws Exception {
    HttpURLConnection h = (HttpURLConnection) new URL(url).openConnection();
    h.setConnectTimeout(15000); h.setReadTimeout(20000); h.setRequestMethod("POST"); h.setDoOutput(true);
    h.setRequestProperty("apikey", api); h.setRequestProperty("Content-Type", "application/json"); h.setRequestProperty("Accept", "application/json");
    try (OutputStream os = h.getOutputStream()) { os.write(body.getBytes("UTF-8")); }
    int code = h.getResponseCode();
    if (code >= 500 || code == 429) throw new IOException("server " + code);
    InputStream in = code < 400 ? h.getInputStream() : h.getErrorStream();
    ByteArrayOutputStream b = new ByteArrayOutputStream(); byte[] buf = new byte[4096]; int n;
    if (in != null) { while ((n = in.read(buf)) > 0) b.write(buf, 0, n); in.close(); }
    if (code >= 400) throw new IllegalStateException("http " + code + " " + b.toString("UTF-8"));
    return new JSONObject(b.toString("UTF-8"));
  }
}
