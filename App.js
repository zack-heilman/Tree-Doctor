import React, { useState, useEffect} from "react";
import {
  Button,
  Text,
  Image,
  ScrollView
} from 'react-native';
import { NativeBaseProvider, Box, Pressable } from "native-base";
import SQLite from 'react-native-sqlite-storage';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import Images from './images/images';
import Arrow from 'react-native-arrow'

const Stack = createNativeStackNavigator();


function errorCB(err) {
  console.log("SQL Error: " + err);
}

function openCB() {
  console.log("Database OPENED");
}

var db = SQLite.openDatabase({
  name: "tree.db",
  createFromLocation: "~www/tree.db"
}, openCB, errorCB);

const navCardStyle = {
  display: 'flex',
  flexDirection: 'row',
  justifyContent: 'space-between',
  backgroundColor: 'white',
  borderColor: 'black',
  borderRadius: 10,
  padding: 10,
  margin: 10,
};

const HomeScreen = ({navigation}) => {
  const [treeTypes, setTreeTypes] = useState([]);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM Types', [], (trans, results) => {
          setTreeTypes(results.rows.raw());
        }, (error) => {
          console.log("Error occurred", error);
        });
    });
  }, []);

  return (
    <ScrollView>
      {treeTypes.map((treeType) => {
        return (
          <Pressable  
            style={navCardStyle}
            key={`index-treeType-${treeType.TypeID}`}
            onPress={() => navigation.navigate('Tree', {type: treeType.TypeID})}
            >
              <Box>{treeType.Type}</Box>
              <Arrow size={15} color={'black'} />
          </Pressable >
        )
      })}
    </ScrollView>

  );
};

const TreeScreen = ({navigation, route}) => {
  const [trees, setTrees] = useState([]);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql('SELECT * FROM Trees WHERE TYPE=?', [route.params.type], (trans, results) => {
        setTrees(results.rows.raw());
        }, (error) => {
          console.log("Error occurred", error);
        });
    });
  }, []);

  return (
    <ScrollView>
      {trees.map((tree) => {
        return (
          <Pressable  
            style={navCardStyle}
            onPress={() => navigation.navigate('Symptoms', {tree: tree.TreesID})}
          >
            <Box>{tree.Tree}</Box>
            <Arrow size={15} color={'black'} />
          </Pressable >
        )
      })}
    </ScrollView>
  );
};

const SymptomsScreen = ({navigation, route}) => {
  const [symptoms, setSymptoms] = useState([]);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(`Select DISTINCT TreesID, LocationsID, DamagesID, Location, Damage from DiseaseLink 
                    JOIN Locations
                    USING (LocationsID)
                    JOIN Damages
                    USING (DamagesID)
                    WHERE TreesID=?
                    ORDER BY Location, Damage`, [route.params.tree], (trans, results) => {
          setSymptoms(results.rows.raw());
        }, (error) => {
          console.log("Error occurred", error);
        });
    });
  }, []);

  let lastLocation = '';

  return (
    <ScrollView>
      {symptoms.map((symptom, index) => {
          let locationTitle = false;
          if (symptom.Location != lastLocation) {
            locationTitle = true;
            lastLocation = symptom.Location;
          }

          return (
            <>
              {locationTitle && 
                <Text
                  key={`index-symptom-location-${symptom.LocationsID}`}
                  style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    margin: 10,
                  }}
                >
                  {symptom.Location}
                </Text>}

                <Pressable  
                  style={navCardStyle}
                  key={index}
                  title={symptom.Damage}
                  onPress={() => navigation.navigate('Diseases', {tree: symptom.TreesID, location: symptom.LocationsID, damage: symptom.DamagesID})}
                >
                  <Box>{symptom.Damage}</Box>
                  <Arrow size={15} color={'black'} />
                </Pressable >
            </>
          )
      })}
    </ScrollView>
  );
};

const DiseasesScreen = ({navigation, route}) => {
  const [diseases, setDiseases] = useState([]);

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(`Select DiseaseTitle, DiseaseSubtitle,
                    group_concat(DISTINCT PicturesID) AS PicturesID, 
                    group_concat(DISTINCT REPLACE(DiseaseElement, ',', '<-->')) AS DiseaseElement 
                    FROM DiseaseLink 
                    JOIN DiseaseTitles
                    ON( DiseaseLink.DiseasesID = DiseaseTitles.DiseaseID)
                    JOIN Pictures
                    USING (DiseasesID)
                    JOIN DiseaseLiElements
                    USING (DiseaseID)
                    WHERE TreesID=?
                    AND LocationsID=?
                    AND DamagesID=?
                    ORDER BY DiseaseID`, [route.params.tree, route.params.location, route.params.damage], (trans, results) => {
          setDiseases(results.rows.raw());
        }, (error) => {
          console.log("Error occurred", error);
        });
    });
  }, []);

  return (
    <ScrollView
      style={{
        backgroundColor: '#E5E5E5',
        minHeight: '100%',
      }}
    >
      {diseases.map((disease, index) => {
        const diseaseCharacteristics = disease.DiseaseElement.split(',');
        return (
          <Box 
            style={{
              borderColor: 'black', 
              borderRadius: 10,
              padding: 10, 
              margin: 10,
              backgroundColor: 'white',
              elevation: 20,
              shadowColor: '#52006A',
            }}
            key={index}
          > 
            <Text 
              style={{
                fontWeight: 'bold',
                fontSize: 20,
                marginBottom: 10,
              }}
            >{disease.DiseaseTitle}</Text>
            
            {disease.DiseaseSubtitle && <Text
              style={{
                fontStyle: 'italic',
                marginBottom: 10,
              }}
            >{disease.DiseaseSubtitle}</Text>}

            {disease.PicturesID.split(',').map((pictureID, index) => {
              return (
              <Image
                key={`picIndex-${index}`}
                source={Images[pictureID]} 
                style={{
                  width: '100%',
                  height: 300,
                  objectFit: 'contain',
                  marginBottom: 10,
                }}
              />
            )})}
            {diseaseCharacteristics.map((characteristic, index) => {
              let displayedCharacteristic = characteristic.replaceAll('<-->', ', ');
              return (
                <Text key={index}>{`\u2022 ${displayedCharacteristic}`}</Text>
              )
            })}
          </Box>
        )
      })}
    </ScrollView>
  );
};

export default function App() {
  return (
    <NativeBaseProvider>
      <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Tree" component={TreeScreen} />
            <Stack.Screen name="Symptoms" component={SymptomsScreen} />
            <Stack.Screen name="Diseases" component={DiseasesScreen} />
          </Stack.Navigator>
      </NavigationContainer>
    </NativeBaseProvider>
  );
}