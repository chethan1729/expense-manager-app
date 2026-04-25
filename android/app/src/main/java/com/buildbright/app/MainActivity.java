package com.buildbright.app;

import android.os.Bundle;
import android.util.Log;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        System.out.println("BRIDGE_DEBUG: Registering SMSReaderNative...");
        try {
            registerPlugin(SMSReaderNative.class);
            Log.d("Capacitor", "SMSReaderNative registered successfully");
            System.out.println("BRIDGE_DEBUG: SMSReaderNative registration SUCCESS");
        } catch (Exception e) {
            Log.e("Capacitor", "Failed to register SMSReaderNative: " + e.getMessage());
            System.out.println("BRIDGE_DEBUG: Registration FAILED: " + e.getMessage());
        }
        super.onCreate(savedInstanceState);
        Log.d("Capacitor", "MainActivity onCreate finished");
    }
}
