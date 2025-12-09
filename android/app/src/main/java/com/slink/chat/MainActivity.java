package com.slink.chat;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    
    private static final int PERMISSION_REQUEST_CODE = 1001;
    private static final int FILE_CHOOSER_REQUEST_CODE = 1002;
    private AudioManager audioManager;
    private ValueCallback<Uri[]> filePathCallback;
    private String cameraPhotoPath;
    
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Initialize AudioManager
        audioManager = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        
        // Create notification channel for push notifications
        createNotificationChannel();
        
        // Request runtime permissions for Android 6.0+
        requestRuntimePermissions();
    }
    
    private void createNotificationChannel() {
        // Create the NotificationChannel, but only on API 26+ (Android 8.0+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            String channelId = "slink_chat_notifications";
            CharSequence channelName = "SlinkChat Messages";
            String channelDescription = "Notifications for new messages and chat requests";
            int importance = NotificationManager.IMPORTANCE_HIGH;
            
            NotificationChannel channel = new NotificationChannel(channelId, channelName, importance);
            channel.setDescription(channelDescription);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setVibrationPattern(new long[]{0, 500, 200, 500});
            channel.setShowBadge(true);
            
            // Register the channel with the system
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                android.util.Log.d("MainActivity", "Notification channel created successfully");
            }
        }
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
                
                // Add JavaScript interface for audio routing
                webView.addJavascriptInterface(new AudioManagerInterface(), "AndroidAudioManager");
                
                // Set WebChromeClient to handle permission requests and file chooser
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
                    
                    // For Android 5.0+ (API 21+)
                    @Override
                    public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback, FileChooserParams fileChooserParams) {
                        android.util.Log.d("FileChooser", "onShowFileChooser called");
                        
                        // Cancel any existing file chooser
                        if (MainActivity.this.filePathCallback != null) {
                            MainActivity.this.filePathCallback.onReceiveValue(null);
                        }
                        
                        MainActivity.this.filePathCallback = filePathCallback;
                        
                        try {
                            Intent intent = fileChooserParams.createIntent();
                            intent.addCategory(Intent.CATEGORY_OPENABLE);
                            intent.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true);
                            
                            android.util.Log.d("FileChooser", "Starting file chooser intent");
                            startActivityForResult(Intent.createChooser(intent, "Select File"), FILE_CHOOSER_REQUEST_CODE);
                            return true;
                        } catch (Exception e) {
                            android.util.Log.e("FileChooser", "Error opening file chooser: " + e.getMessage());
                            MainActivity.this.filePathCallback = null;
                            return false;
                        }
                    }
                });
            }
        } catch (Exception e) {
            android.util.Log.e("MainActivity", "Error configuring WebView: " + e.getMessage());
        }
    }
    
    // JavaScript Interface for Audio Routing
    public class AudioManagerInterface {
        
        @JavascriptInterface
        public void setEarpiece() {
            runOnUiThread(() -> {
                try {
                    if (audioManager != null) {
                        android.util.Log.d("AudioManager", "Setting audio output to EARPIECE");
                        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        audioManager.setSpeakerphoneOn(false);
                        android.util.Log.d("AudioManager", "Audio routed to earpiece");
                    }
                } catch (Exception e) {
                    android.util.Log.e("AudioManager", "Error setting earpiece: " + e.getMessage());
                }
            });
        }
        
        @JavascriptInterface
        public void setSpeaker() {
            runOnUiThread(() -> {
                try {
                    if (audioManager != null) {
                        android.util.Log.d("AudioManager", "Setting audio output to SPEAKER");
                        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
                        audioManager.setSpeakerphoneOn(true);
                        android.util.Log.d("AudioManager", "Audio routed to speaker");
                    }
                } catch (Exception e) {
                    android.util.Log.e("AudioManager", "Error setting speaker: " + e.getMessage());
                }
            });
        }
        
        @JavascriptInterface
        public boolean isSpeakerOn() {
            try {
                if (audioManager != null) {
                    return audioManager.isSpeakerphoneOn();
                }
            } catch (Exception e) {
                android.util.Log.e("AudioManager", "Error checking speaker state: " + e.getMessage());
            }
            return false;
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
    
    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        if (requestCode == FILE_CHOOSER_REQUEST_CODE) {
            android.util.Log.d("FileChooser", "onActivityResult called - resultCode: " + resultCode);
            
            if (filePathCallback == null) {
                android.util.Log.w("FileChooser", "filePathCallback is null");
                return;
            }
            
            Uri[] results = null;
            
            if (resultCode == Activity.RESULT_OK) {
                if (data != null) {
                    // Handle multiple files
                    if (data.getClipData() != null) {
                        int count = data.getClipData().getItemCount();
                        results = new Uri[count];
                        for (int i = 0; i < count; i++) {
                            results[i] = data.getClipData().getItemAt(i).getUri();
                        }
                        android.util.Log.d("FileChooser", "Selected " + count + " files");
                    }
                    // Handle single file
                    else if (data.getData() != null) {
                        results = new Uri[]{data.getData()};
                        android.util.Log.d("FileChooser", "Selected 1 file: " + data.getData());
                    }
                }
            } else {
                android.util.Log.d("FileChooser", "File selection cancelled");
            }
            
            filePathCallback.onReceiveValue(results);
            filePathCallback = null;
        }
    }
}
