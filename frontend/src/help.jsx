const Help = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-8">
          UniRide Help & Support
        </h1>

        <div className="space-y-6">
          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              📖 How to Use UniRide
            </h2>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                For Students:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Login with your student credentials</li>
                <li>Go to Student Portal to see available drivers</li>
                <li>Select your destination from the dropdown</li>
                <li>Wait for a driver to accept your ride</li>
                <li>Click "Complete Ride" when you reach your destination</li>
              </ul>
            </div>

            <div className="bg-green-50 p-4 rounded-lg mt-4">
              <h3 className="text-lg font-semibold text-green-700 mb-2">
                For Drivers:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>Login with your driver credentials</li>
                <li>Go to Driver Portal to see ride requests</li>
                <li>Accept rides from available pickup points</li>
                <li>Each driver can carry up to 6 students</li>
                <li>Seats become available when students complete rides</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🔄 Sync with Database
            </h2>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-gray-700">
                Use the <strong>"Sync with Database"</strong> option in the Help
                dropdown to manually refresh your data. This is useful if:
              </p>
              <ul className="list-disc list-inside space-y-2 text-gray-700 mt-2">
                <li>Your screen seems out of sync with actual data</li>
                <li>You've just logged in and want fresh data</li>
                <li>You suspect there might be a display issue</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              🐛 Troubleshooting
            </h2>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-700 mb-2">
                Common Issues:
              </h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li>
                  <strong>Map not loading:</strong> Refresh the page or use Sync
                  with Database
                </li>
                <li>
                  <strong>Ride requests not updating:</strong> Check your
                  internet connection
                </li>
                <li>
                  <strong>Can't login:</strong> Make sure you're using the
                  correct credentials
                </li>
                <li>
                  <strong>Driver seats not updating:</strong> Use Sync with
                  Database to refresh
                </li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              📞 Contact Support
            </h2>
            <div className="bg-red-50 p-4 rounded-lg">
              <p className="text-gray-700">
                If you're experiencing issues that aren't resolved by the above
                solutions, please contact our support team:
              </p>
              <div className="mt-3 space-y-2">
                <p className="text-gray-700">
                  <strong>Email:</strong> support@uniride.com
                </p>
                <p className="text-gray-700">
                  <strong>Phone:</strong> +8801941746201
                </p>
                <p className="text-gray-700">
                  <strong>Location:</strong> Shahjalal University of Science &
                  Technology, Sylhet
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Help;
