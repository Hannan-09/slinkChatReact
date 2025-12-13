/**
 * One-time cleanup script to remove currentUserId key
 * Run this in browser console: copy and paste this code
 */

console.log("🧹 Cleaning up currentUserId key...");

try {
  const currentUserId = localStorage.getItem("currentUserId");

  if (currentUserId) {
    console.log("Found currentUserId:", currentUserId);
    localStorage.removeItem("currentUserId");
    console.log("✅ Removed currentUserId key");
  } else {
    console.log("ℹ️ No currentUserId key found");
  }

  // Show remaining keys
  console.log("📋 Remaining localStorage keys:");
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`  - ${key}`);
  }

  console.log("✅ Cleanup complete!");
} catch (error) {
  console.error("❌ Cleanup failed:", error);
}
