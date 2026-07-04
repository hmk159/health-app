#!/bin/bash
set -e

export ANDROID_HOME=/workspace/android-sdk
BUILD_TOOLS=$ANDROID_HOME/build-tools/34.0.0
PLATFORM=$ANDROID_HOME/platforms/android-34

rm -rf build
mkdir -p build/compiled_res build/gen build/obj build/out

# Compile resources
echo "Compiling resources..."
$BUILD_TOOLS/aapt2 compile -o build/compiled_res/ --dir res

# Link resources and generate R.java
echo "Linking resources..."
$BUILD_TOOLS/aapt2 link \
    -o build/out/app-base.apk \
    -I $PLATFORM/android.jar \
    --manifest AndroidManifest.xml \
    -A assets \
    --java build/gen \
    --target-sdk-version 34 \
    --min-sdk-version 24 \
    build/compiled_res/*.flat

# Compile Java source
echo "Compiling Java..."
javac \
    -source 1.8 -target 1.8 \
    -cp $PLATFORM/android.jar \
    -d build/obj \
    src/com/example/healthapp/MainActivity.java \
    build/gen/com/example/healthapp/R.java

# Convert to DEX
echo "Converting to DEX..."
$BUILD_TOOLS/d8 \
    --release \
    --output build/out \
    build/obj/com/example/healthapp/*.class

# Add DEX to APK
echo "Packaging APK..."
cd build/out
unzip -q app-base.apk -d app_extracted
mv classes.dex app_extracted/
rm app-base.apk
cd app_extracted
zip -rq ../app-unsigned.apk .
cd ../../..

# Align APK
echo "Aligning APK..."
$BUILD_TOOLS/zipalign -p -f 4 build/out/app-unsigned.apk build/out/app-aligned.apk

# Generate debug keystore if needed
if [ ! -f build/debug.keystore ]; then
    echo "Generating debug keystore..."
    keytool -genkey -v \
        -keystore build/debug.keystore \
        -alias androiddebugkey \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass android -keypass android \
        -dname "CN=Android Debug,O=Android,C=US"
fi

# Sign APK
echo "Signing APK..."
$BUILD_TOOLS/apksigner sign \
    --ks build/debug.keystore \
    --ks-pass pass:android \
    --key-pass pass:android \
    --out HealthApp.apk \
    build/out/app-aligned.apk

echo "Done: HealthApp.apk"
