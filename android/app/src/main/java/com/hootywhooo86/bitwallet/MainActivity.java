package com.hootywhooo86.bitwallet;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(WalletAlerts.class);
        super.onCreate(savedInstanceState);
    }
}
