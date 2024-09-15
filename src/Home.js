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
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS from 'react-native-fs';
import Sound from 'react-native-sound';

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
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
        ]);

        return (
          granted['android.permission.RECORD_AUDIO'] ===
            PermissionsAndroid.RESULTS.GRANTED &&
          granted['android.permission.WRITE_EXTERNAL_STORAGE'] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
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
      console.log(files, 'filess___');
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
    const result = await audioRecorderPlayer.startRecorder();
    audioRecorderPlayer.addRecordBackListener(e => {
      console.log('Recording: ', e.currentPosition);
      return;
    });
    console.log('Recording started at: ', result);
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

    // Move the recorded file to the Downloads folder
    await RNFS.moveFile(result, path)
      .then(() => {
        console.log('File saved at: ', path);
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
