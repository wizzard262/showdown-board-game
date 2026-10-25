using Android.App;
using Android.Graphics;
using Android.OS;
using Android.Views;
using Android.Webkit;
using Android.Content.PM;
using System.Runtime.Versioning;
using Showdown;

namespace Showdown
{
    [Activity(Label = "Showdown", MainLauncher = true, Exported = true, Icon = "@drawable/icon",
        Theme = "@android:style/Theme.Material.NoActionBar", ScreenOrientation = ScreenOrientation.SensorLandscape)]
    public class MainActivity : Activity
    {
        protected override void OnCreate(Bundle bundle)
        {
            base.OnCreate(bundle);

            SetContentView(Resource.Layout.Main);
            WebView localWebView = FindViewById<WebView>(Resource.Id.LocalWebView);

            // Android 15+ always draws apps edge-to-edge, so keep the game clear of the status and navigation bars
            if (System.OperatingSystem.IsAndroidVersionAtLeast(35))
            {
                FindViewById(Android.Resource.Id.Content).SetOnApplyWindowInsetsListener(new SystemBarsPadding());
            }

            localWebView.SetWebViewClient(new WebViewClient());
            localWebView.Settings.JavaScriptEnabled = true;
            localWebView.Settings.DomStorageEnabled = true;

            localWebView.Settings.AllowContentAccess = true;
            localWebView.Settings.AllowFileAccess = true;
            localWebView.Settings.AllowFileAccessFromFileURLs = true;
            localWebView.Settings.AllowUniversalAccessFromFileURLs = true;
            localWebView.LoadUrl("file:///android_asset/index.html");
        }

        [SupportedOSPlatform("android30.0")]
        class SystemBarsPadding : Java.Lang.Object, View.IOnApplyWindowInsetsListener
        {
            public WindowInsets OnApplyWindowInsets(View view, WindowInsets insets)
            {
                Insets bars = insets.GetInsets(WindowInsets.Type.SystemBars() | WindowInsets.Type.DisplayCutout());
                view.SetPadding(bars.Left, bars.Top, bars.Right, bars.Bottom);
                return WindowInsets.Consumed;
            }
        }
    }
}
