
package fr.michaelvilleneuve.customcrop;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.WritableMap;

import org.opencv.android.Utils;
import org.opencv.core.Core;
import org.opencv.core.CvType;
import org.opencv.core.Mat;
import org.opencv.core.MatOfInt;
import org.opencv.core.MatOfPoint;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Point;
import org.opencv.imgcodecs.*;
import org.opencv.core.Rect;
import org.opencv.core.Scalar;
import org.opencv.core.Size;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;

import org.opencv.calib3d.Calib3d;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.lang.Integer;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import java.util.UUID;

public class RNCustomCropModule extends ReactContextBaseJavaModule {
  private static final String TAG = "RNCustomCropModule";

  private final ReactApplicationContext reactContext;

  public RNCustomCropModule(ReactApplicationContext reactContext) {
    super(reactContext);
    this.reactContext = reactContext;
  }

  @Override
  public String getName() {
    return "CustomCropManager";
  }

  @ReactMethod
  public void crop(ReadableMap points, String imageUri, Callback callback) {

    Point tl = new Point(points.getMap("topLeft").getDouble("x"), points.getMap("topLeft").getDouble("y"));
    Point tr = new Point(points.getMap("topRight").getDouble("x"), points.getMap("topRight").getDouble("y"));
    Point bl = new Point(points.getMap("bottomLeft").getDouble("x"), points.getMap("bottomLeft").getDouble("y"));
    Point br = new Point(points.getMap("bottomRight").getDouble("x"), points.getMap("bottomRight").getDouble("y"));

    Bitmap bmp = BitmapFactory.decodeFile(imageUri.replace("file://", ""));
    /* Mat src = Imgcodecs.imread(imageUri.replace("file://", ""), Imgproc.COLOR_BGR2RGB);
    Log.i("ReactNative", Integer.toString(src.channels())); */
    Mat src = new Mat (bmp.getWidth(), bmp.getHeight(), CvType.CV_8UC1);
    Bitmap bmp32 = bmp.copy(Bitmap.Config.ARGB_8888, true);
    Utils.bitmapToMat(bmp32, src);
    Imgproc.cvtColor(src, src, Imgproc.COLOR_BGR2RGB);
    Imgproc.resize(src, src, new Size(points.getDouble("width"), points.getDouble("height")));

    boolean ratioAlreadyApplied = tr.x * (src.size().width / 500) < src.size().width;
    double ratio = ratioAlreadyApplied ? src.size().width / 500 : 1;

    double widthA = Math.sqrt(Math.pow(br.x - bl.x, 2) + Math.pow(br.y - bl.y, 2));
    double widthB = Math.sqrt(Math.pow(tr.x - tl.x, 2) + Math.pow(tr.y - tl.y, 2));

    double dw = Math.max(widthA, widthB);
    int maxWidth = Double.valueOf(dw).intValue();

    double heightA = Math.sqrt(Math.pow(tr.x - br.x, 2) + Math.pow(tr.y - br.y, 2));
    double heightB = Math.sqrt(Math.pow(tl.x - bl.x, 2) + Math.pow(tl.y - bl.y, 2));

    double dh = Math.max(heightA, heightB);
    int maxHeight = Double.valueOf(dh).intValue();

    Mat doc = new Mat(maxHeight, maxWidth, CvType.CV_8UC4);

    Mat src_mat = new Mat(4, 1, CvType.CV_32FC2);
    Mat dst_mat = new Mat(4, 1, CvType.CV_32FC2);

    src_mat.put(0, 0, tl.x, tl.y, tr.x, tr.y, br.x, br.y, bl.x, bl.y);
    dst_mat.put(0, 0, 0.0, 0.0, dw, 0.0, dw, dh, 0.0, dh);

    Mat m = Imgproc.getPerspectiveTransform(src_mat, dst_mat);

    Imgproc.warpPerspective(src, doc, m, doc.size());

    Bitmap bitmap = Bitmap.createBitmap(doc.cols(), doc.rows(), Bitmap.Config.ARGB_8888);
    Utils.matToBitmap(doc, bitmap);

    String fileName;
    String folderName = "croped";
    String folderDir = this.reactContext.getCacheDir().toString();
    File folder = new File(folderDir + "/" + folderName);
    if (!folder.exists()) {
        boolean result = folder.mkdirs();
        if (result) Log.d(TAG, "wrote: created folder " + folder.getPath());
        else Log.d(TAG, "Not possible to create folder"); // TODO: Manage this error better
    }
    fileName = folderDir + "/" + folderName + "/" + UUID.randomUUID()
                + ".jpg";

    File file = new File(fileName);
    try (FileOutputStream out = new FileOutputStream(file)) {
        bitmap.compress(Bitmap.CompressFormat.JPEG, 100, out);
    } catch (IOException e) {
        e.printStackTrace();
    }

    // ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
    // bitmap.compress(Bitmap.CompressFormat.JPEG, 70, byteArrayOutputStream);
    // byte[] byteArray = byteArrayOutputStream.toByteArray();

    WritableMap map = Arguments.createMap();
    // map.putString("image", Base64.encodeToString(byteArray, Base64.DEFAULT));
    if(!fileName.startsWith("file://")) fileName = "file://" + fileName;
    map.putString("image", fileName);
    callback.invoke(null, map);

    m.release();
  }

}