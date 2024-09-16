import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';
import {check, checkMultiple,PERMISSIONS, RESULTS, request} from 'react-native-permissions';

const AudioRecorder = () => {
  useEffect(() => {
    listAudioFiles();
  }, []);
  const [recording, setRecording] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentSound, setCurrentSound] = useState(null); // Reference to the currently playing sound

  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;
  const downloadDir =
    Platform.OS === 'android'
      ? RNFS.DownloadDirectoryPath
      : RNFS.DocumentDirectoryPath;


      const uploadFile = async (filePath, fileName) => {
        if (!filePath) {
          Alert.alert('Error', 'No file selected');
          return;
        }
    
        // Create a form data object
        const formData = new FormData();
        formData.append('file', {
          uri: filePath,
          type: 'audio/m4a', 
          name: fileName 
        });
        console.log(JSON.stringify({
            uri: filePath,
            type: 'audio/m4a', 
            name: fileName 
          }), "dndiowfnowe___")

        
    
        try {
          const response = await fetch('apiEndPoint', {
            method: 'POST',
            body: formData,
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
    
          if (response.ok) {
            const result = await response.json();
            Alert.alert('Success', 'File uploaded successfully');
            console.log('Upload result:', result);
          } else {
            // Alert.alert('Error', 'Failed to upload file');
            console.error('Upload failed:', response.status);
          }
        } catch (error) {
          // Alert.alert('Error', 'An error occurred during upload');
          console.error('Upload error:', error);
        }
      };

  // Function to render the list of audio files
  const renderAudioFile = ({item}) => {
    return (
      <TouchableOpacity
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: 20,
        }}
        onPress={async () => {
          playAudio(item.path);
        }}>
        <Text style={{padding: 10, borderBottomWidth: 1}}>{item.name}</Text>
        <Text>Play</Text>
      </TouchableOpacity>
    );
  };

  // Request microphone and storage permissions for Android
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      try {
        checkMultiple([PERMISSIONS.ANDROID.RECORD_AUDIO, PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE, PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE]).then(async (statuses) => {
          if(statuses[PERMISSIONS.ANDROID.RECORD_AUDIO] !== 'granted'){
          const result = await request(
       
             PERMISSIONS.ANDROID.RECORD_AUDIO 
          );
        
          if (result === RESULTS.GRANTED) {
            onStartRecord()
            console.log('Audio recording permission granted');
          } else {
            console.log('Audio recording permission denied');
          }
        } else if (statuses[PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE] !== "granted"){
          const result = await request(
            Platform.OS === 'android' 
              ? PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE 
              : PERMISSIONS.IOS.MEDIA_LIBRARY
          );
        
          if (result === RESULTS.GRANTED) {
            console.log('Storage permission granted');
          } else {
            console.log('Storage permission denied');
          }
        }

          });

          

        // const granted = await PermissionsAndroid.requestMultiple([
        //   PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        //   PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        //   PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        // ]);

        // return (
        //   granted['android.permission.RECORD_AUDIO'] ===
        //     PermissionsAndroid.RESULTS.GRANTED &&
        //   granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
        //     PermissionsAndroid.RESULTS.GRANTED
        // );
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Function to list all files in the Document Directory
  const listAudioFiles = async () => {
    try {
      const files = await RNFS.readDir(downloadDir);
      const audioFileList = files.filter(file => file.name.endsWith('.m4a'));
      setAudioFiles(audioFileList);
    } catch (error) {
      console.log('Error reading directory:', error);
    }
  };

  // Start recording audio
  const onStartRecord = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      return;
    }
    setRecording(true);
    await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener(e => {
      console.log('Recording: ', e.currentPosition);
      return;
    });
    listAudioFiles();
  };

  // Stop recording audio and save the file in Downloads folder
  const onStopRecord = async () => {
    const result = await audioRecorderPlayer.stopRecorder();
    audioRecorderPlayer.removeRecordBackListener();
    setRecording(false);

    // Define the path to save the file in the Downloads folder
    const downloadDir =
      Platform.OS === 'android'
        ? RNFS.DownloadDirectoryPath
        : RNFS.DocumentDirectoryPath;
    const fileName = new Date().getUTCMilliseconds() + '_Audio.m4a';
    const path = `${downloadDir}/${fileName}`;
    console.log(path,'savePath__')

    // Move the recorded file to the Downloads folder
    await RNFS.moveFile(result, path)
      .then(() => {
        console.log('File saved at: ', path);
        uploadFile(path,fileName)
        listAudioFiles();
      })
      .catch(error => {
        console.log('Error saving file: ', error);
      });
  };

  // Play selected audio file
  const playAudio = filePath => {
    // Stop currently playing sound if any
    if (currentSound) {
      currentSound.stop(() => {
        currentSound.release();
        startPlaying(filePath);
      });
    } else {
      startPlaying(filePath);
    }
  };

  // Start playing a new audio file
  const startPlaying = filePath => {
    const sound = new Sound(filePath, '', error => {
      if (error) {
        console.log('Failed to load the sound', error);
        return;
      }

      setCurrentSound(sound);

      sound.play(success => {
        if (success) {
          console.log('Successfully finished playing');
        } else {
          console.log('Playback failed');
        }
        // Release the sound object after playback
        sound.release();
        setCurrentSound(null);
      });
    });
  };

  return (
    <SafeAreaView style={{flex:1}}>
        <View style={{flex:1,padding: 20}} >
        <Text style={{fontSize:18, fontWeight:600, marginBottom:10}}>Audio Recorder</Text>
      {!recording ? (
        <Button title="Start Recording" onPress={onStartRecord}/>
      ) : (
        <Button title="Stop Recording" onPress={onStopRecord} />
      )}

      <Text style={{marginVertical: 20}}>Recorded Audio Files:</Text>
      {audioFiles.length > 0 ? (
        <FlatList
          data={audioFiles}
          renderItem={renderAudioFile}
          keyExtractor={item => item.path}
        />
      ) : (
        <Text>No audio files found.</Text>
      )}

        </View>
     
    </SafeAreaView>
  );
};

export default AudioRecorder;
