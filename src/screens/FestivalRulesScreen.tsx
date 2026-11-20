import React,{useState} from 'react';
import {ScrollView,Text,View} from 'react-native';
import {SafeAreaView,useSafeAreaInsets} from 'react-native-safe-area-context';
import type {NativeStackScreenProps} from '@react-navigation/native-stack';
import {useAppData} from '../context/DataContext';
import {NativeIconButton,NativePills,NativeEmpty,NativeButton} from '../components/festival-native/native-controls';
import {isExternalLinkVisible} from '../components/ExternalLink';
import {openExternalUrl} from '../utils/openExternalUrl';
import {festivalNative as f} from '../theme/native-festival';
import type {MoreStackParamList} from '../navigation/types';
export function FestivalRulesScreen({navigation}:NativeStackScreenProps<MoreStackParamList,'FestivalRules'>){
 const {data}=useAppData(),insets=useSafeAreaInsets(),[selected,setSelected]=useState(''),active=data.rules.find(tab=>tab.id===selected)||data.rules[0];
 return <SafeAreaView edges={['top']} style={f.screen}><View style={f.header}><NativeIconButton name="arrow-back" label="Назад" onPress={()=>navigation.goBack()}/><Text accessibilityRole="header" style={[f.display,{flex:1,fontSize:29}]}>Правила и быт</Text></View><View style={{marginBottom:10}}><NativePills items={data.rules.map(tab=>({id:tab.id,label:tab.label}))} selected={active?.id||''} onSelect={setSelected} label="Категории правил"/></View>{active?<ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[f.content,{gap:12,paddingBottom:84+insets.bottom}]}>{active.blocks.filter(block=>block.title?.trim()||block.paragraphs?.some(text=>text.trim())||block.items?.some(text=>text.trim())||(block.link?.label.trim()&&isExternalLinkVisible(block.link.url))).map((block,index)=><View key={index} style={[f.glass,{padding:18,gap:13,backgroundColor:block.important?'rgba(255,218,0,.07)':'rgba(255,255,255,.045)'}]}>{block.title?<Text style={[f.sectionTitle,{fontSize:24}]}>{block.title}</Text>:null}{block.paragraphs?.filter(text=>text.trim()).map((paragraph,index)=><Text key={index} style={[f.body,{fontSize:12,lineHeight:20}]}>{paragraph}</Text>)}{block.items?.filter(text=>text.trim()).map((item,index)=><View key={index} style={{flexDirection:'row',gap:10}}><Text style={{color:'#ffda00'}}>•</Text><Text style={[f.body,{fontSize:12,lineHeight:20,flex:1}]}>{item}</Text></View>)}{block.link&&isExternalLinkVisible(block.link.url)?<NativeButton label={block.link.label} icon="open-outline" onPress={()=>void openExternalUrl(block.link!.url)}/>:null}</View>)}</ScrollView>:<NativeEmpty title="Раздел скоро появится"/>}</SafeAreaView>;
}
