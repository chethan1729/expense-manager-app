package com.buildbright.app;

import android.Manifest;
import android.content.ContentResolver;
import android.database.Cursor;
import android.net.Uri;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import java.util.List;

@CapacitorPlugin(
    name = "SMSReaderNative",
    permissions = {
        @Permission(
            alias = "sms",
            strings = {Manifest.permission.READ_SMS}
        )
    }
)
public class SMSReaderNative extends Plugin {

    public SMSReaderNative() {
        super();
        System.out.println("BRIDGE_DEBUG: SMSReaderNative object created");
    }

    @PluginMethod
    public void getSMSList(PluginCall call) {
        if (getPermissionState("sms") != PermissionState.GRANTED) {
            requestPermissionForAlias("sms", call, "smsPermissionCallback");
        } else {
            fetchSMS(call);
        }
    }

    @PluginMethod
    public void testConnection(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("status", "connected");
        call.resolve(ret);
    }

    @PermissionCallback
    private void smsPermissionCallback(PluginCall call) {
        if (getPermissionState("sms") == PermissionState.GRANTED) {
            fetchSMS(call);
        } else {
            call.reject("Permission is required to read SMS");
        }
    }

    private void fetchSMS(PluginCall call) {
        try {
            JSArray smsList = new JSArray();
            ContentResolver contentResolver = getContext().getContentResolver();
            Cursor cursor = contentResolver.query(
                Uri.parse("content://sms/inbox"),
                new String[]{"body", "address", "date"},
                null,
                null,
                "date DESC LIMIT 100" // Get last 100 messages for better coverage
            );

            if (cursor != null && cursor.moveToFirst()) {
                do {
                    JSObject sms = new JSObject();
                    sms.put("body", cursor.getString(cursor.getColumnIndexOrThrow("body")));
                    sms.put("address", cursor.getString(cursor.getColumnIndexOrThrow("address")));
                    sms.put("date", cursor.getLong(cursor.getColumnIndexOrThrow("date")));
                    smsList.put(sms);
                } while (cursor.moveToNext());
                cursor.close();
            }

            JSObject ret = new JSObject();
            ret.put("smsList", smsList);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Failed to fetch SMS: " + e.getMessage());
        }
    }
}
