package com.lovable.reset;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.provider.CalendarContract;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "CalendarHandoff")
public class CalendarHandoffPlugin extends Plugin {
    @PluginMethod
    public void openEvent(PluginCall call) {
        String title = call.getString("title");
        Double start = call.getDouble("start");
        Double end = call.getDouble("end");
        if (title == null || start == null || end == null || end <= start) {
            call.reject("A title and valid event dates are required.");
            return;
        }
        Intent intent = new Intent(Intent.ACTION_INSERT, CalendarContract.Events.CONTENT_URI)
            .putExtra(CalendarContract.Events.TITLE, title)
            .putExtra(CalendarContract.Events.DESCRIPTION, call.getString("description", ""))
            .putExtra(CalendarContract.EXTRA_EVENT_BEGIN_TIME, start.longValue())
            .putExtra(CalendarContract.EXTRA_EVENT_END_TIME, end.longValue());
        if (Boolean.TRUE.equals(call.getBoolean("google", false))) intent.setPackage("com.google.android.calendar");
        JSObject result = new JSObject();
        try {
            getActivity().startActivity(intent);
            result.put("completed", true);
        } catch (ActivityNotFoundException exception) {
            result.put("completed", false);
        }
        call.resolve(result);
    }
}