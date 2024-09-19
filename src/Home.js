import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  Button,
  PermissionsAndroid,
  Platform,
  SafeAreaView,
  Image,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import RNFS, {readFile} from 'react-native-fs';
import Sound from 'react-native-sound';
import {
  check,
  checkMultiple,
  PERMISSIONS,
  RESULTS,
  request,
} from 'react-native-permissions';
import CheckBox from '@react-native-community/checkbox';

const AudioRecorder = () => {
  useEffect(() => {
    getChecklist();
  }, []);

  const [recording, setRecording] = useState(false);
  const [audioFiles, setAudioFiles] = useState([]);
  const [currentSound, setCurrentSound] = useState(null);
  const [checklist, setChecklist] = useState([]);
  const [checklistSelected, setChecklistSelected] = useState([])

  getChecklist = async () => {
    const response = await fetch(
      'https://d9a2-2600-6c40-657f-aa84-cc5-2153-fe9b-e676.ngrok-free.app/chat/2/get_checklist',
      {
        method: 'GET',
      },
    );
    const responseJSON = await response.json();
    if (responseJSON) {
      console.log(responseJSON.checklist, 'checklist');
      setChecklist(responseJSON.checklist);
    }
  };

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
    formData.append('audio_input', {
      uri: filePath,
      type: 'audio/m4a', // Adjust this based on the file type
      name: fileName,
    });
    formData.append('id', 2); // Append numeric or string data
    formData.append('dryrun', true);

    try {
      const response = await fetch(
        'https://d9a2-2600-6c40-657f-aa84-cc5-2153-fe9b-e676.ngrok-free.app/chat',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      const responseJSON = await response.json();

      if (responseJSON) {
        console.log(
          JSON.stringify(responseJSON.checklist),
          'responseJSSONNN__',
        );
        setChecklistSelected(responseJSON.checklist)
        let responseAudio = responseJSON.res_audio;
        const path = `${downloadDir}/responseFile.mp3`;

        RNFS.writeFile(path, responseAudio, 'base64').then(() => {
          console.log('response File Creatd');
          playAudio(path);
          // listAudioFiles()
        });
      }
    } catch (error) {
      Alert.alert('Error', 'An error occurred during upload');
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
        checkMultiple([
          PERMISSIONS.ANDROID.RECORD_AUDIO,
          PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE,
          PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE,
        ]).then(async statuses => {
          if (statuses[PERMISSIONS.ANDROID.RECORD_AUDIO] !== 'granted') {
            const result = await request(PERMISSIONS.ANDROID.RECORD_AUDIO);

            if (result === RESULTS.GRANTED) {
              onStartRecord();
              console.log('Audio recording permission granted');
            } else {
              console.log('Audio recording permission denied');
            }
          } else if (
            statuses[PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE] !== 'granted'
          ) {
            const result = await request(
              Platform.OS === 'android'
                ? PERMISSIONS.ANDROID.WRITE_EXTERNAL_STORAGE
                : PERMISSIONS.IOS.MEDIA_LIBRARY,
            );

            if (result === RESULTS.GRANTED) {
              console.log('Storage permission granted');
            } else {
              console.log('Storage permission denied');
            }
          }
        });
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  // Function to list all files in the Document Directory
  // const listAudioFiles = async () => {
  //   try {
  //     const files = await RNFS.readDir(downloadDir);
  //     const audioFileList = files.filter(file =>
  //       file.name.endsWith('.m4a') || file.name.endsWith('.mp3')
  //     );      setAudioFiles(audioFileList);
  //   } catch (error) {
  //     console.log('Error reading directory:', error);
  //   }
  // };

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
    // listAudioFiles();
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
    console.log(path, 'savePath__');

    // Move the recorded file to the Downloads folder
    await RNFS.moveFile(result, path)
      .then(() => {
        console.log('File saved at: ', path);
        uploadFile(path, fileName);
        // listAudioFiles();
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
    <SafeAreaView style={{flex: 1}}>
      <View style={{flex: 1, padding: 20}}>
        {!recording ? (
          <TouchableOpacity
            style={{alignSelf: 'center'}}
            onPress={onStartRecord}>
            <Image
              source={require('./images/mic1.png')}
              style={{width: 180, height: 180, tintColor: 'green', marginBottom:40}}
            />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{alignSelf: 'center'}}
            onPress={onStopRecord}>
            <Image
              source={require('./images/stopRecord.png')}
              style={{width: 150, height: 150, marginBottom:40}}
            />
          </TouchableOpacity>
        )}

        <Text style={{fontSize: 18, fontWeight: 600, marginBottom: 20}}>
          Checklist
        </Text>
        {Object.keys(checklist).map(key => (
          <View  key={key} style={{flexDirection:'row', marginBottom:10, alignItems:'center'}}>
            <CheckBox disabled value={ checklistSelected[key] == true } onValeChange={() => {}} style={{}} />
            <Text style={{fontSize:16, fontWeight:500, marginLeft:10}}>{checklist[key]}</Text>
          </View>
        ))}

        {/* <Text style={{marginVertical: 20}}>Recorded Audio Files:</Text>
      {audioFiles.length > 0 ? (
        <FlatList
          data={audioFiles}
          renderItem={renderAudioFile}
          keyExtractor={item => item.path}
        />
      ) : (
        <Text>No audio files found.</Text>
      )} */}
      </View>
    </SafeAreaView>
  );
};

export default AudioRecorder;
