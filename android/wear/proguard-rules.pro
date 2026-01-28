# NutritionRx Wear OS ProGuard Rules

# Keep Wear OS Tiles
-keep class androidx.wear.tiles.** { *; }
-keep class androidx.wear.protolayout.** { *; }

# Keep Complications
-keep class androidx.wear.watchface.complications.** { *; }

# Keep Data Layer classes
-keep class com.google.android.gms.wearable.** { *; }

# Keep Gson serialization
-keepattributes Signature
-keepattributes *Annotation*
-keep class com.nutritionrx.wear.data.** { *; }
-keepclassmembers class com.nutritionrx.wear.data.** { *; }

# Keep Compose
-keep class androidx.compose.** { *; }
