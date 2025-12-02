package com.slink.chat;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final int PERMISSION_REQUEST_CODE = 1001;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Request runtime permissions for Android 6.0+
        requestRuntimePermissions();
    }
    
    @Override
    public void onStart() {
        super.onStart();
        
        // Configure WebView after it's fully initialized
        try {
            WebView webView = getBridge().getWebView();
            if (webView != null) {
                WebSettings settings = webView.getSettings();
                
                // Enable necessary WebView features for WebRTC
                settings.setJavaScriptEnabled(true);
                settings.setMediaPlaybackRequiresUserGesture(false);
                settings.setDomStorageEnabled(true);
                settings.setDatabaseEnabled(true);
                settings.setAllowFileAccess(true);
                settings.setAllowContentAccess(true);
                
                // Set WebChromeClient to handle permission requests
                webView.setWebChromeClient(new WebChromeClient() {
                    @Override
                    public void onPermissionRequest(final PermissionRequest request) {
                        // Auto-grant camera and microphone permissions for WebRTC
                        runOnUiThread(() -> {
                            if (request != null && request.getResources() != null) {
                                request.grant(request.getResources());
                            }
                        });
                    }
                });
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error configuring WebView: " + e.getMessage());
        }
    }
    
    private void requestRuntimePermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            java.util.ArrayList<String> permissionsList = new java.util.ArrayList<>();
            
            // Camera and Audio permissions
            permissionsList.add(Manifest.permission.CAMERA);
            permissionsList.add(Manifest.permission.RECORD_AUDIO);
            permissionsList.add(Manifest.permission.MODIFY_AUDIO_SETTINGS);
            
            // Storage permissions based on Android version
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                // Android 13+ (API 33+)
                permissionsList.add(Manifest.permission.READ_MEDIA_IMAGES);
                permissionsList.add(Manifest.permission.READ_MEDIA_VIDEO);
                permissionsList.add(Manifest.permission.READ_MEDIA_AUDIO);
            } else {
                // Android 6-12 (API 23-32)
                permissionsList.add(Manifest.permission.READ_EXTERNAL_STORAGE);
                permissionsList.add(Manifest.permission.WRITE_EXTERNAL_STORAGE);
            }
            
            // Check which permissions are needed
            java.util.ArrayList<String> permissionsNeeded = new java.util.ArrayList<>();
            for (String permission : permissionsList) {
                if (ContextCompat.checkSelfPermission(this, permission) 
                        != PackageManager.PERMISSION_GRANTED) {
                    permissionsNeeded.add(permission);
                }
            }
            
            // Request permissions if needed
            if (!permissionsNeeded.isEmpty()) {
                String[] permissionsArray = permissionsNeeded.toArray(new String[0]);
                ActivityCompat.requestPermissions(this, permissionsArray, PERMISSION_REQUEST_CODE);
            }
        }
    }
    
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean allGranted = true;
            for (int result : grantResults) {
                if (result != PackageManager.PERMISSION_GRANTED) {
                    allGranted = false;
                    break;
                }
            }
            
            if (!allGranted) {
                // Permissions not granted - you might want to show a message to the user
                android.util.Log.w("MainActivity", "Some permissions were not granted");
            }
        }
    }
}
