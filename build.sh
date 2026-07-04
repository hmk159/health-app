#!/bin/bash
set -e

export ANDROID_HOME=/workspace/android-sdk
BUILD_TOOLS=$ANDROID_HOME/build-tools/35.0.1
PLATFORM=$ANDROID_HOME/platforms/android-35

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
    --target-sdk-version 35 \
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

# Add DEX to APK while preserving aapt2 structure
echo "Packaging APK..."
cp build/out/app-base.apk build/out/app-unsigned.apk
zip -qj build/out/app-unsigned.apk build/out/classes.dex

# Align APK
echo "Aligning APK..."
$BUILD_TOOLS/zipalign -p -f 4 build/out/app-unsigned.apk build/out/app-aligned.apk

# Generate release keystore if needed
if [ ! -f build/release.keystore ]; then
    echo "Generating release keystore..."
    keytool -genkey -v \
        -keystore build/release.keystore \
        -alias healthapp \
        -keyalg RSA -keysize 2048 -validity 10000 \
        -storepass android -keypass android \
        -dname "CN=Health App,O=HealthApp,C=US"
fi

# Sign APK
echo "Signing APK..."
$BUILD_TOOLS/apksigner sign \
    --ks build/release.keystore \
    --ks-pass pass:android \
    --key-pass pass:android \
    --v1-signing-enabled \
    --v2-signing-enabled \
    --v3-signing-enabled \
    --out HealthApp.apk \
    build/out/app-aligned.apk

echo "Done: HealthApp.apk"
