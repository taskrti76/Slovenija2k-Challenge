package io.github.taskrti76.dvatisocaki;

import android.Manifest;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

/**
 * Started by a tap on the widget. Invisible: checks the location permission (asks for it if needed), then starts
 * VerifyService (it gets the GPS fix as a foreground service, allowed because this tap made the app visible) and closes.
 */
public class VerifyActivity extends Activity {
  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    if (!WidgetStore.on(this)) {   // not set up: open the app (Jaz → Pripomoček)
      startActivity(new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
      finish(); return;
    }
    if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
      ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.ACCESS_COARSE_LOCATION}, 1);
      return;
    }
    go();
  }
  @Override public void onRequestPermissionsResult(int code, String[] p, int[] r) {
    if (r.length > 0 && r[0] == PackageManager.PERMISSION_GRANTED) go();
    else {
      WidgetStore.show(this, "far", WidgetStore.t(this, "Ni dovoljenja", "No permission"), WidgetStore.t(this, "Lokacija", "Location"),
        WidgetStore.t(this, "Dovoli lokacijo med uporabo", "Allow location while in use"), "");
      finish();
    }
  }
  private void go() {
    Intent i = new Intent(this, VerifyService.class);
    try { if (Build.VERSION.SDK_INT >= 26) startForegroundService(i); else startService(i); } catch (Exception ignored) {}
    finish();
    overridePendingTransition(0, 0);
  }
}
