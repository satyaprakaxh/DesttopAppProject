module.exports = {
  packagerConfig: {
    name: 'Athena Exam',
    executableName: 'athena-exam',
    appBundleId: 'com.example.athenaexam',
    asar: true,

    extendInfo: {
      NSCameraUsageDescription:
        'Athena Exam uses the camera to display the exam setup preview.'
    }
  },

  makers: [
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin']
    }
  ]
};