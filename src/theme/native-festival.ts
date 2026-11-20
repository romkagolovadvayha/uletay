import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { appFont } from './typography';
import {festivalNavigation} from '../../shared/navigation-bar';

export const NATIVE_NAV_HEIGHT=festivalNavigation.height;
export const festivalNative=StyleSheet.create({
  screen:{flex:1,backgroundColor:'transparent'},
  content:{paddingHorizontal:14,paddingBottom:NATIVE_NAV_HEIGHT+28},
  display:{fontFamily:'FestivalDisplay',fontSize:34,lineHeight:37,color:colors.text,textTransform:'uppercase'},
  sectionTitle:{fontFamily:'FestivalDisplay',fontSize:27,lineHeight:30,color:colors.text,textTransform:'uppercase'},
  body:{...appFont('regular'),fontSize:14,lineHeight:20,color:colors.text},
  muted:{...appFont('regular'),fontSize:12,lineHeight:17,color:'#bfb2bc'},
  glass:{backgroundColor:'rgba(255,255,255,0.065)',borderRadius:20,borderCurve:'continuous'},
  header:{paddingHorizontal:14,paddingTop:14,paddingBottom:12,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:10},
  headerTools:{flexDirection:'row',alignItems:'center',gap:6},
  eyebrow:{...appFont('bold'),fontSize:10,lineHeight:14,letterSpacing:1.1,color:colors.primary,textTransform:'uppercase'},
});
