#!/usr/bin/env node

/**
 * Patch Capacitor plugins to use Java 17 instead of Java 21
 * Run this after npm install
 */

const fs = require("fs");
const path = require("path");

const pluginsToPatch = [
  "node_modules/@capacitor/app/android/build.gradle",
  "node_modules/@capacitor/push-notifications/android/build.gradle",
];

console.log("🔧 Patching Capacitor plugins to use Java 17...\n");

pluginsToPatch.forEach((filePath) => {
  const fullPath = path.join(process.cwd(), filePath);

  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  File not found: ${filePath}`);
    return;
  }

  try {
    let content = fs.readFileSync(fullPath, "utf8");

    // Replace Java 21 with Java 17
    const originalContent = content;
    content = content.replace(
      /sourceCompatibility JavaVersion\.VERSION_21/g,
      "sourceCompatibility JavaVersion.VERSION_17"
    );
    content = content.replace(
      /targetCompatibility JavaVersion\.VERSION_21/g,
      "targetCompatibility JavaVersion.VERSION_17"
    );

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, "utf8");
      console.log(`✅ Patched: ${filePath}`);
    } else {
      console.log(`ℹ️  No changes needed: ${filePath}`);
    }
  } catch (error) {
    console.error(`❌ Error patching ${filePath}:`, error.message);
  }
});

console.log("\n✨ Patching complete!");
console.log("💡 Run: cd android && gradlew clean && gradlew assembleDebug");
