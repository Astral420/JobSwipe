import React, { useState } from 'react';
import { Image, ScrollView, Text, TextInput, TouchableOpacity, View, Platform, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { Divider, Radii, Spacing, Typography } from '../../ui';
import { COMPANY_SIZE_OPTIONS, INDUSTRY_OPTIONS, Step, WorkEntry, EducationEntry } from './types';
import { COUNTRIES, getProvincesForCountry, getProvincesForRegion, getCitiesForProvince } from '../../../constants/locations';

type LocalUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

type Props = {
  T: any;
  stepKey: Step;
  fieldLabelStyle: any;
  inputRowStyle: any;
  inputStyle: any;
  password: string;
  confirmPassword: string;
  showPassword: boolean;
  setPassword: (value: string) => void;
  setConfirmPassword: (value: string) => void;
  setShowPassword: (value: boolean) => void;
  strengthLevel: 'weak' | 'good' | 'strong' | null;
  strengthColor: string;
  firstName: string;
  lastName: string;
  location: string;
  locationCity: string;
  locationRegion: string;
  locationProvince: string;
  locationCountry: string;
  bio: string;
  setFirstName: (value: string) => void;
  setLastName: (value: string) => void;
  setLocation: (value: string) => void;
  setLocationCity: (value: string) => void;
  setLocationRegion: (value: string) => void;
  setLocationProvince: (value: string) => void;
  setLocationCountry: (value: string) => void;
  setBio: (value: string) => void;
  resumeFile: LocalUploadFile | null;
  setResumeFile: (value: LocalUploadFile | null) => void;
  hardSkills: string[];
  softSkills: string[];
  hardSkillInput: string;
  softSkillInput: string;
  setHardSkillInput: (value: string) => void;
  setSoftSkillInput: (value: string) => void;
  addSkill: (type: 'hard' | 'soft', value?: string) => void;
  removeSkill: (type: 'hard' | 'soft', skill: string) => void;
  hardSkillSuggestions: string[];
  softSkillSuggestions: string[];
  workEntries: WorkEntry[];
  setWorkEntries: (value: WorkEntry[] | ((prev: WorkEntry[]) => WorkEntry[])) => void;
  educationEntries: EducationEntry[];
  setEducationEntries: (value: EducationEntry[] | ((prev: EducationEntry[]) => EducationEntry[])) => void;
  photoFile: LocalUploadFile | null;
  setPhotoFile: (value: LocalUploadFile | null) => void;
  linkedinUrl: string;
  githubUrl: string;
  portfolioUrl: string;
  twitterUrl: string;
  setLinkedinUrl: (value: string) => void;
  setGithubUrl: (value: string) => void;
  setPortfolioUrl: (value: string) => void;
  setTwitterUrl: (value: string) => void;
  companyName: string;
  companyTagline: string;
  companyDescription: string;
  companyIndustry: string;
  companySize: string;
  foundedYear: string;
  websiteUrl: string;
  addressStreet: string;
  addressCity: string;
  addressState: string;
  addressProvince: string;
  addressCountry: string;
  addressPostal: string;
  companySocialLinks: string[];
  setCompanyName: (value: string) => void;
  setCompanyTagline: (value: string) => void;
  setCompanyDescription: (value: string) => void;
  setCompanyIndustry: (value: string) => void;
  setCompanySize: (value: string) => void;
  setFoundedYear: (value: string) => void;
  setWebsiteUrl: (value: string) => void;
  setAddressStreet: (value: string) => void;
  setAddressCity: (value: string) => void;
  setAddressState: (value: string) => void;
  setAddressProvince: (value: string) => void;
  setAddressCountry: (value: string) => void;
  setAddressPostal: (value: string) => void;
  setCompanySocialLinks: (value: string[] | ((prev: string[]) => string[])) => void;
  verificationDocs: LocalUploadFile[];
  setVerificationDocs: (value: LocalUploadFile[] | ((prev: LocalUploadFile[]) => LocalUploadFile[])) => void;
  logoFile: LocalUploadFile | null;
  setLogoFile: (value: LocalUploadFile | null) => void;
  officeImages: LocalUploadFile[];
  setOfficeImages: (value: LocalUploadFile[] | ((prev: LocalUploadFile[]) => LocalUploadFile[])) => void;
  setError: (value: string) => void;
};

// ─── Design tokens matching the login page white sheet ────────────────────────
const S = {
  // Card wrapper — sits on the white sheet so no extra bg needed
  card: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  } as const,
  cardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#111827',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 18,
  },
  // Pill chip (skills, industry, size)
  chip: (selected: boolean) => ({
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: selected ? '#7C3AED' : '#F3F4F6',
    borderWidth: selected ? 0 : 1,
    borderColor: '#E5E7EB',
  }),
  chipText: (selected: boolean) => ({
    fontSize: 13,
    color: selected ? '#fff' : '#6B7280',
    fontWeight: selected ? ('700' as const) : ('400' as const),
  }),
  // Suggestion dropdown row
  suggestion: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  // Skill tag
  skillTag: (color: string) => ({
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: color + '18',
    borderWidth: 1,
    borderColor: color + '40',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  }),
  // Upload zone
  uploadZone: (active: boolean) => ({
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: active ? '#10B981' : '#E5E7EB',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center' as const,
    gap: 8,
    backgroundColor: active ? '#F0FDF4' : '#F9FAFB',
  }),
  // Add button row
  addRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
  },
  // Section divider inside a card
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
};

// Reusable card container replacing SectionCard
function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={S.card}>
      {title ? <Text style={S.cardTitle}>{title}</Text> : null}
      {children}
    </View>
  );
}

// Date picker component using custom picker UI
function DatePickerField({
  label,
  value,
  onChange,
  fieldLabelStyle,
  inputRowStyle,
}: {
  label: string;
  value: string;
  onChange: (date: string) => void;
  fieldLabelStyle: any;
  inputRowStyle: any;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  const formatDate = (d: Date): string => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const years = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: String(i + 1).padStart(2, '0')
  }));
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const handleConfirm = () => {
    onChange(formatDate(tempDate));
    setShowPicker(false);
  };

  return (
    <View style={{ flex: 1, gap: 6 }}>
      <Text style={fieldLabelStyle}>{label}</Text>
      <TouchableOpacity
        style={inputRowStyle}
        onPress={() => setShowPicker(true)}
      >
        <MaterialCommunityIcons name="calendar-outline" size={14} color="#9CA3AF" />
        <Text style={{ flex: 1, fontSize: 14, color: value ? '#111827' : '#9CA3AF' }}>
          {value || 'Select date'}
        </Text>
      </TouchableOpacity>

      <Modal
        visible={showPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPicker(false)}
      >
        <TouchableOpacity 
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setShowPicker(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            style={{ 
              width: '90%', 
              maxWidth: 420,
              backgroundColor: '#fff', 
              borderRadius: 20, 
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <TouchableOpacity onPress={() => setShowPicker(false)} style={{ padding: 4 }}>
                <Text style={{ fontSize: 16, color: '#EF4444', fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#111827' }}>Select Date</Text>
              <TouchableOpacity onPress={handleConfirm} style={{ padding: 4 }}>
                <Text style={{ fontSize: 16, color: '#7C3AED', fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* Year Picker */}
              <View style={{ flex: 1.5, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F9FAFB' }}>
                <Picker
                  selectedValue={tempDate.getFullYear()}
                  onValueChange={(year) => {
                    const newDate = new Date(tempDate);
                    newDate.setFullYear(year);
                    setTempDate(newDate);
                  }}
                  itemStyle={{ fontSize: 18, height: 44 }}
                  style={{ height: 180 }}
                >
                  {years.map((year) => (
                    <Picker.Item key={year} label={String(year)} value={year} />
                  ))}
                </Picker>
              </View>

              {/* Month Picker */}
              <View style={{ flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F9FAFB' }}>
                <Picker
                  selectedValue={tempDate.getMonth()}
                  onValueChange={(month) => {
                    const newDate = new Date(tempDate);
                    newDate.setMonth(month);
                    // Adjust day if it exceeds the new month's days
                    const maxDay = getDaysInMonth(newDate.getFullYear(), month);
                    if (newDate.getDate() > maxDay) {
                      newDate.setDate(maxDay);
                    }
                    setTempDate(newDate);
                  }}
                  itemStyle={{ fontSize: 18, height: 44 }}
                  style={{ height: 180 }}
                >
                  {months.map((month) => (
                    <Picker.Item key={month.value} label={month.label} value={month.value} />
                  ))}
                </Picker>
              </View>

              {/* Day Picker */}
              <View style={{ flex: 1, borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12, overflow: 'hidden', backgroundColor: '#F9FAFB' }}>
                <Picker
                  selectedValue={tempDate.getDate()}
                  onValueChange={(day) => {
                    const newDate = new Date(tempDate);
                    newDate.setDate(day);
                    setTempDate(newDate);
                  }}
                  itemStyle={{ fontSize: 18, height: 44 }}
                  style={{ height: 180 }}
                >
                  {Array.from({ length: getDaysInMonth(tempDate.getFullYear(), tempDate.getMonth()) }, (_, i) => i + 1).map((day) => (
                    <Picker.Item key={day} label={String(day).padStart(2, '0')} value={day} />
                  ))}
                </Picker>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export function RegisterStepContent(props: Props) {
  const {
    T,
    stepKey,
    fieldLabelStyle,
    inputRowStyle,
    inputStyle,
    password,
    confirmPassword,
    showPassword,
    setPassword,
    setConfirmPassword,
    setShowPassword,
    strengthLevel,
    strengthColor,
    firstName,
    lastName,
    location,
    locationCity,
    locationRegion,
    locationProvince,
    locationCountry,
    bio,
    setFirstName,
    setLastName,
    setLocation,
    setLocationCity,
    setLocationRegion,
    setLocationProvince,
    setLocationCountry,
    setBio,
    resumeFile,
    setResumeFile,
    hardSkills,
    softSkills,
    hardSkillInput,
    softSkillInput,
    setHardSkillInput,
    setSoftSkillInput,
    addSkill,
    removeSkill,
    hardSkillSuggestions,
    softSkillSuggestions,
    workEntries,
    setWorkEntries,
    educationEntries,
    setEducationEntries,
    photoFile,
    setPhotoFile,
    linkedinUrl,
    githubUrl,
    portfolioUrl,
    twitterUrl,
    setLinkedinUrl,
    setGithubUrl,
    setPortfolioUrl,
    setTwitterUrl,
    companyName,
    companyTagline,
    companyDescription,
    companyIndustry,
    companySize,
    foundedYear,
    websiteUrl,
    addressStreet,
    addressCity,
    addressState,
    addressProvince,
    addressCountry,
    addressPostal,
    companySocialLinks,
    setCompanyName,
    setCompanyTagline,
    setCompanyDescription,
    setCompanyIndustry,
    setCompanySize,
    setFoundedYear,
    setWebsiteUrl,
    setAddressStreet,
    setAddressCity,
    setAddressState,
    setAddressProvince,
    setAddressCountry,
    setAddressPostal,
    setCompanySocialLinks,
    verificationDocs,
    setVerificationDocs,
    logoFile,
    setLogoFile,
    officeImages,
    setOfficeImages,
    setError,
  } = props;

  switch (stepKey) {

    // ── Password ──────────────────────────────────────────────────────────────
    case 'password':
      return (
        <Card title="Set a password">
          <View style={{ gap: 12 }}>
            <View style={{ gap: 6 }}>
              <Text style={fieldLabelStyle}>Password</Text>
              <View style={inputRowStyle}>
                <MaterialCommunityIcons name="lock-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Min. 8 chars, 1 uppercase, 1 number"
                  placeholderTextColor="#9CA3AF"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoFocus
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 4 }}>
                  <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
              {strengthLevel && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, height: 3, backgroundColor: '#F3F4F6', borderRadius: 2, overflow: 'hidden' }}>
                    <View style={{
                      height: '100%',
                      borderRadius: 2,
                      backgroundColor: strengthColor,
                      width: strengthLevel === 'weak' ? '33%' : strengthLevel === 'good' ? '66%' : '100%',
                    }} />
                  </View>
                  <Text style={{ fontSize: 11, color: strengthColor, fontWeight: '700', minWidth: 36 }}>
                    {strengthLevel === 'weak' ? 'Weak' : strengthLevel === 'good' ? 'Good' : 'Strong'}
                  </Text>
                </View>
              )}
            </View>

            <View style={S.divider} />

            <View style={{ gap: 6 }}>
              <Text style={fieldLabelStyle}>Confirm password</Text>
              <View style={inputRowStyle}>
                <MaterialCommunityIcons name="lock-check-outline" size={16} color="#9CA3AF" />
                <TextInput
                  style={[inputStyle, { flex: 1 }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#9CA3AF"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>
        </Card>
      );

    // ── Basic Info ────────────────────────────────────────────────────────────
    case 'basic': {
      const isPhilippines = locationCountry === 'Philippines';
      const availableRegionsOrStates = getProvincesForCountry(locationCountry);
      const availableProvinces = isPhilippines ? getProvincesForRegion(locationRegion) : [];
      const availableCities = isPhilippines
        ? getCitiesForProvince(locationCountry, locationProvince)
        : getCitiesForProvince(locationCountry, locationRegion);

      return (
        <View style={{ gap: 12 }}>
          {/* Name */}
          <Card title="Your name">
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={fieldLabelStyle}>First name *</Text>
                <View style={inputRowStyle}>
                  <TextInput style={inputStyle} placeholder="John" placeholderTextColor="#9CA3AF" value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
                </View>
              </View>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={fieldLabelStyle}>Last name *</Text>
                <View style={inputRowStyle}>
                  <TextInput style={inputStyle} placeholder="Doe" placeholderTextColor="#9CA3AF" value={lastName} onChangeText={setLastName} autoCapitalize="words" />
                </View>
              </View>
            </View>
          </Card>

          {/* Location */}
          <Card title="Location *">
            <View style={{ gap: 10 }}>
              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Country</Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker selectedValue={locationCountry} onValueChange={(value) => { setLocationCountry(value); setLocationRegion(''); setLocationProvince(''); setLocationCity(''); setLocation(''); }} style={{ flex: 1, color: '#111827' }}>
                    <Picker.Item label="Select country..." value="" />
                    {COUNTRIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
                  </Picker>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>
                  {isPhilippines ? 'Region' : locationCountry === 'United States' || locationCountry === 'Australia' ? 'State' : locationCountry === 'Canada' ? 'Province' : 'Region'}
                </Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker selectedValue={locationRegion} onValueChange={(value) => { setLocationRegion(value); setLocationProvince(''); setLocationCity(''); if (!isPhilippines && value && locationCity) setLocation(`${locationCity}, ${value}`); }} style={{ flex: 1, color: '#111827' }} enabled={!!locationCountry}>
                    <Picker.Item label={locationCountry ? (isPhilippines ? 'Select region...' : 'Select...') : 'Select country first'} value="" />
                    {availableRegionsOrStates.map((item) => <Picker.Item key={item} label={item} value={item} />)}
                  </Picker>
                </View>
              </View>

              {isPhilippines && (
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Province</Text>
                  <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                    <Picker selectedValue={locationProvince} onValueChange={(value) => { setLocationProvince(value); setLocationCity(''); }} style={{ flex: 1, color: '#111827' }} enabled={!!locationRegion}>
                      <Picker.Item label={locationRegion ? 'Select province...' : 'Select region first'} value="" />
                      {availableProvinces.map((p) => <Picker.Item key={p} label={p} value={p} />)}
                    </Picker>
                  </View>
                </View>
              )}

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>City</Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker
                    selectedValue={locationCity}
                    onValueChange={(value) => {
                      setLocationCity(value);
                      if (value) {
                        if (isPhilippines && locationProvince) setLocation(`${value}, ${locationProvince}`);
                        else if (!isPhilippines && locationRegion) setLocation(`${value}, ${locationRegion}`);
                      }
                    }}
                    style={{ flex: 1, color: '#111827' }}
                    enabled={isPhilippines ? !!locationProvince : !!locationRegion}
                  >
                    <Picker.Item label={isPhilippines ? (locationProvince ? 'Select city...' : 'Select province first') : (locationRegion ? 'Select city...' : 'Select region first')} value="" />
                    {availableCities.map((city) => <Picker.Item key={city} label={city} value={city} />)}
                  </Picker>
                </View>
              </View>
            </View>
          </Card>

          {/* Bio */}
          <Card title="Bio">
            <View style={{ gap: 6 }}>
              <View style={[inputRowStyle, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                <TextInput
                  style={[inputStyle, { minHeight: 80, textAlignVertical: 'top' }]}
                  placeholder="Tell us about yourself..."
                  placeholderTextColor="#9CA3AF"
                  value={bio}
                  onChangeText={setBio}
                  multiline
                  maxLength={500}
                />
              </View>
              <Text style={[S.hint, { textAlign: 'right' }]}>{bio.length}/500</Text>
            </View>
          </Card>
        </View>
      );
    }

    // ── Resume ────────────────────────────────────────────────────────────────
    case 'resume':
      return (
        <Card title="Upload your resume">
          <Text style={S.hint}>PDF or Word document. Max 5MB.</Text>
          <TouchableOpacity
            style={S.uploadZone(!!resumeFile)}
            onPress={async () => {
              const result = await DocumentPicker.getDocumentAsync({
                type: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
                copyToCacheDirectory: true,
              });
              if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setResumeFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, size: asset.size });
              }
            }}
          >
            <MaterialCommunityIcons name={resumeFile ? 'file-check-outline' : 'file-upload-outline'} size={36} color={resumeFile ? '#10B981' : '#7C3AED'} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: resumeFile ? '#10B981' : '#111827' }}>
              {resumeFile ? resumeFile.name : 'Tap to upload resume'}
            </Text>
            <Text style={S.hint}>PDF / DOCX — max 5 MB</Text>
          </TouchableOpacity>
          {resumeFile && (
            <TouchableOpacity onPress={() => setResumeFile(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center' }}>
              <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
              <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove file</Text>
            </TouchableOpacity>
          )}
        </Card>
      );

    // ── Skills ────────────────────────────────────────────────────────────────
    case 'skills':
      return (
        <View style={{ gap: 12 }}>
          <Text style={S.hint}>Add your hard and soft skills separately.</Text>

          {/* Hard skills */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialCommunityIcons name="hammer-wrench" size={15} color="#7C3AED" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Hard skills</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[inputRowStyle, { flex: 1 }]}>
                <MaterialCommunityIcons name="tag-outline" size={15} color="#9CA3AF" />
                <TextInput style={inputStyle} placeholder="Excel, SQL, Figma..." placeholderTextColor="#9CA3AF" value={hardSkillInput} onChangeText={setHardSkillInput} returnKeyType="done" onSubmitEditing={() => addSkill('hard')} autoCapitalize="words" autoCorrect={false} />
              </View>
              <TouchableOpacity onPress={() => addSkill('hard')} style={{ backgroundColor: '#7C3AED', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            {hardSkillSuggestions.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
                {hardSkillSuggestions.map((s, i) => (
                  <TouchableOpacity key={s} onPress={() => addSkill('hard', s)} style={[S.suggestion, { borderBottomWidth: i < hardSkillSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#F9FAFB' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#7C3AED" />
                      <Text style={{ fontSize: 13, color: '#111827' }}>{s}</Text>
                    </View>
                    <MaterialCommunityIcons name="plus" size={15} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {hardSkills.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {hardSkills.map((skill) => (
                  <View key={skill} style={S.skillTag('#7C3AED')}>
                    <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill('hard', skill)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="close" size={13} color="#7C3AED" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={S.hint}>No hard skills added yet</Text>
            )}
          </Card>

          {/* Soft skills */}
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialCommunityIcons name="account-group-outline" size={15} color="#10B981" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#111827' }}>Soft skills</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={[inputRowStyle, { flex: 1 }]}>
                <MaterialCommunityIcons name="tag-outline" size={15} color="#9CA3AF" />
                <TextInput style={inputStyle} placeholder="Leadership, Empathy..." placeholderTextColor="#9CA3AF" value={softSkillInput} onChangeText={setSoftSkillInput} returnKeyType="done" onSubmitEditing={() => addSkill('soft')} autoCapitalize="words" autoCorrect={false} />
              </View>
              <TouchableOpacity onPress={() => addSkill('soft')} style={{ backgroundColor: '#10B981', borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            {softSkillSuggestions.length > 0 && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, overflow: 'hidden', marginTop: 4 }}>
                {softSkillSuggestions.map((s, i) => (
                  <TouchableOpacity key={s} onPress={() => addSkill('soft', s)} style={[S.suggestion, { borderBottomWidth: i < softSkillSuggestions.length - 1 ? 1 : 0, borderBottomColor: '#F9FAFB' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#10B981" />
                      <Text style={{ fontSize: 13, color: '#111827' }}>{s}</Text>
                    </View>
                    <MaterialCommunityIcons name="plus" size={15} color="#9CA3AF" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
            {softSkills.length > 0 ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {softSkills.map((skill) => (
                  <View key={skill} style={S.skillTag('#10B981')}>
                    <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSkill('soft', skill)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                      <MaterialCommunityIcons name="close" size={13} color="#10B981" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={S.hint}>No soft skills added yet</Text>
            )}
          </Card>
        </View>
      );

    // ── Experience ────────────────────────────────────────────────────────────
    case 'experience':
      return (
        <View style={{ gap: 12 }}>
          {/* Work experience */}
          <Card title="Work experience">
            {workEntries.map((entry, index) => (
              <View key={index} style={{ gap: 10, paddingTop: index > 0 ? 12 : 0, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: '#F3F4F6' }}>
                {index > 0 && (
                  <TouchableOpacity onPress={() => setWorkEntries((prev) => prev.filter((_, idx) => idx !== index))} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="minus-circle-outline" size={14} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove</Text>
                  </TouchableOpacity>
                )}
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Company</Text>
                  <View style={inputRowStyle}>
                    <MaterialCommunityIcons name="office-building-outline" size={14} color="#9CA3AF" />
                    <TextInput style={inputStyle} placeholder="Acme Corp" placeholderTextColor="#9CA3AF" value={entry.company} onChangeText={(v) => setWorkEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, company: v } : item))} />
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Position</Text>
                  <View style={inputRowStyle}>
                    <MaterialCommunityIcons name="briefcase-outline" size={14} color="#9CA3AF" />
                    <TextInput style={inputStyle} placeholder="Software Engineer" placeholderTextColor="#9CA3AF" value={entry.position} onChangeText={(v) => setWorkEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, position: v } : item))} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <DatePickerField
                    label="Start"
                    value={entry.start_date}
                    onChange={(date) => setWorkEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, start_date: date } : item))}
                    fieldLabelStyle={fieldLabelStyle}
                    inputRowStyle={inputRowStyle}
                  />
                  <DatePickerField
                    label="End"
                    value={entry.end_date}
                    onChange={(date) => setWorkEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, end_date: date } : item))}
                    fieldLabelStyle={fieldLabelStyle}
                    inputRowStyle={inputRowStyle}
                  />
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Description</Text>
                  <View style={[inputRowStyle, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                    <TextInput style={[inputStyle, { minHeight: 60, textAlignVertical: 'top' }]} placeholder="Describe your role..." placeholderTextColor="#9CA3AF" value={entry.description} onChangeText={(v) => setWorkEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, description: v } : item))} multiline maxLength={500} />
                  </View>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setWorkEntries((prev) => [...prev, { company: '', position: '', start_date: '', end_date: '', description: '' }])} style={S.addRow}>
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#7C3AED" />
              <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>Add another position</Text>
            </TouchableOpacity>
          </Card>

          {/* Education */}
          <Card title="Education">
            <Text style={[S.hint, { marginBottom: 4 }]}>Optional but recommended</Text>
            {educationEntries.map((entry, index) => (
              <View key={index} style={{ gap: 10, paddingTop: index > 0 ? 12 : 0, borderTopWidth: index > 0 ? 1 : 0, borderTopColor: '#F3F4F6' }}>
                {index > 0 && (
                  <TouchableOpacity onPress={() => setEducationEntries((prev) => prev.filter((_, idx) => idx !== index))} style={{ alignSelf: 'flex-end', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MaterialCommunityIcons name="minus-circle-outline" size={14} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove</Text>
                  </TouchableOpacity>
                )}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={fieldLabelStyle}>School</Text>
                    <View style={inputRowStyle}>
                      <TextInput style={inputStyle} placeholder="MIT" placeholderTextColor="#9CA3AF" value={entry.school} onChangeText={(v) => setEducationEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, school: v } : item))} />
                    </View>
                  </View>
                  <View style={{ flex: 1, gap: 6 }}>
                    <Text style={fieldLabelStyle}>Degree</Text>
                    <View style={inputRowStyle}>
                      <TextInput style={inputStyle} placeholder="B.S." placeholderTextColor="#9CA3AF" value={entry.degree} onChangeText={(v) => setEducationEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, degree: v } : item))} />
                    </View>
                  </View>
                </View>
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Field of study</Text>
                  <View style={inputRowStyle}>
                    <TextInput style={inputStyle} placeholder="Computer Science" placeholderTextColor="#9CA3AF" value={entry.field_of_study} onChangeText={(v) => setEducationEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, field_of_study: v } : item))} />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <DatePickerField
                    label="Start"
                    value={entry.start_date}
                    onChange={(date) => setEducationEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, start_date: date } : item))}
                    fieldLabelStyle={fieldLabelStyle}
                    inputRowStyle={inputRowStyle}
                  />
                  <DatePickerField
                    label="End"
                    value={entry.end_date}
                    onChange={(date) => setEducationEntries((prev) => prev.map((item, idx) => idx === index ? { ...item, end_date: date } : item))}
                    fieldLabelStyle={fieldLabelStyle}
                    inputRowStyle={inputRowStyle}
                  />
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setEducationEntries((prev) => [...prev, { school: '', degree: '', field_of_study: '', start_date: '', end_date: '' }])} style={S.addRow}>
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#7C3AED" />
              <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>Add another education</Text>
            </TouchableOpacity>
          </Card>
        </View>
      );

    // ── Photo ─────────────────────────────────────────────────────────────────
    case 'photo':
      return (
        <Card title="Profile photo">
          <Text style={S.hint}>JPG or PNG, max 2 MB. Optional.</Text>
          <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
            <TouchableOpacity
              onPress={async () => {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) { setError('Permission to access photos is required.'); return; }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                if (!result.canceled && result.assets?.[0]) {
                  const asset = result.assets[0];
                  const name = asset.uri.split('/').pop() ?? 'photo.jpg';
                  setPhotoFile({ uri: asset.uri, name, mimeType: asset.mimeType ?? null, size: asset.fileSize });
                }
              }}
              style={{
                width: 100, height: 100, borderRadius: 50,
                borderWidth: 2, borderStyle: 'dashed',
                borderColor: photoFile ? '#10B981' : '#E5E7EB',
                backgroundColor: photoFile ? '#F0FDF4' : '#F9FAFB',
                alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
              }}
            >
              {photoFile
                ? <Image source={{ uri: photoFile.uri }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                : <MaterialCommunityIcons name="camera-plus-outline" size={34} color="#7C3AED" />}
            </TouchableOpacity>
            {photoFile
              ? <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>{photoFile.name}</Text>
              : <Text style={S.hint}>Tap to upload</Text>}
            {photoFile && (
              <TouchableOpacity onPress={() => setPhotoFile(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove photo</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      );

    // ── Social Links ──────────────────────────────────────────────────────────
    case 'social':
      return (
        <Card title="Social links">
          <Text style={[S.hint, { marginBottom: 4 }]}>All optional</Text>
          {[
            { label: 'LinkedIn', icon: 'linkedin' as const, placeholder: 'https://linkedin.com/in/...', value: linkedinUrl, onChange: setLinkedinUrl },
            { label: 'GitHub', icon: 'github' as const, placeholder: 'https://github.com/...', value: githubUrl, onChange: setGithubUrl },
            { label: 'Portfolio', icon: 'web' as const, placeholder: 'https://yourportfolio.com', value: portfolioUrl, onChange: setPortfolioUrl },
            { label: 'Twitter', icon: 'twitter' as const, placeholder: 'https://twitter.com/...', value: twitterUrl, onChange: setTwitterUrl },
          ].map(({ label, icon, placeholder, value, onChange }, index, all) => (
            <View key={label}>
              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>{label}</Text>
                <View style={inputRowStyle}>
                  <MaterialCommunityIcons name={icon} size={15} color="#9CA3AF" />
                  <TextInput style={inputStyle} placeholder={placeholder} placeholderTextColor="#9CA3AF" value={value} onChangeText={onChange} keyboardType="url" autoCapitalize="none" autoCorrect={false} />
                </View>
              </View>
              {index < all.length - 1 && <View style={[S.divider, { marginVertical: 10 }]} />}
            </View>
          ))}
        </Card>
      );

    // ── Company Details ───────────────────────────────────────────────────────
    case 'company_details':
      return (
        <View style={{ gap: 12 }}>
          <Card title="Company details">
            <View style={{ gap: 10 }}>
              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Company name *</Text>
                <View style={inputRowStyle}>
                  <MaterialCommunityIcons name="domain" size={15} color="#9CA3AF" />
                  <TextInput style={inputStyle} placeholder="Acme Corporation" placeholderTextColor="#9CA3AF" value={companyName} onChangeText={setCompanyName} maxLength={100} />
                </View>
                <Text style={[S.hint, { textAlign: 'right' }]}>{companyName.length}/100</Text>
              </View>

              <View style={S.divider} />

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Tagline</Text>
                <View style={inputRowStyle}>
                  <TextInput style={inputStyle} placeholder="Building the future of..." placeholderTextColor="#9CA3AF" value={companyTagline} onChangeText={setCompanyTagline} maxLength={100} />
                </View>
              </View>

              <View style={S.divider} />

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Description *</Text>
                <View style={[inputRowStyle, { alignItems: 'flex-start', paddingVertical: 10 }]}>
                  <TextInput style={[inputStyle, { minHeight: 100, textAlignVertical: 'top' }]} placeholder="Tell us about your company..." placeholderTextColor="#9CA3AF" value={companyDescription} onChangeText={setCompanyDescription} multiline maxLength={2000} />
                </View>
                <Text style={[S.hint, { textAlign: 'right' }]}>{companyDescription.length}/2000 (min 50)</Text>
              </View>
            </View>
          </Card>

          <Card title="Industry & size">
            <View style={{ gap: 10 }}>
              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Industry *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 2 }}>
                    {INDUSTRY_OPTIONS.map((option) => (
                      <TouchableOpacity key={option} onPress={() => setCompanyIndustry(option)} style={S.chip(companyIndustry === option)}>
                        <Text style={S.chipText(companyIndustry === option)}>{option}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={S.divider} />

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Company size *</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {COMPANY_SIZE_OPTIONS.map((option) => (
                    <TouchableOpacity key={option} onPress={() => setCompanySize(option)} style={S.chip(companySize === option)}>
                      <Text style={S.chipText(companySize === option)}>{option}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={S.divider} />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1, gap: 6 }}>
                  <Text style={fieldLabelStyle}>Founded year</Text>
                  <View style={inputRowStyle}>
                    <MaterialCommunityIcons name="calendar-outline" size={15} color="#9CA3AF" />
                    <TextInput style={inputStyle} placeholder="2020" placeholderTextColor="#9CA3AF" value={foundedYear} onChangeText={setFoundedYear} keyboardType="number-pad" maxLength={4} />
                  </View>
                </View>
                <View style={{ flex: 2, gap: 6 }}>
                  <Text style={fieldLabelStyle}>Website URL</Text>
                  <View style={inputRowStyle}>
                    <MaterialCommunityIcons name="web" size={15} color="#9CA3AF" />
                    <TextInput style={inputStyle} placeholder="https://company.com" placeholderTextColor="#9CA3AF" value={websiteUrl} onChangeText={setWebsiteUrl} keyboardType="url" autoCapitalize="none" autoCorrect={false} />
                  </View>
                </View>
              </View>
            </View>
          </Card>

          {/* Address */}
          <Card title="Address">
            <Text style={[S.hint, { marginBottom: 4 }]}>Optional</Text>
            <View style={{ gap: 10 }}>
              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Street</Text>
                <View style={inputRowStyle}>
                  <MaterialCommunityIcons name="map-marker-outline" size={15} color="#9CA3AF" />
                  <TextInput style={inputStyle} placeholder="123 Main St" placeholderTextColor="#9CA3AF" value={addressStreet} onChangeText={setAddressStreet} maxLength={200} />
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Country</Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker selectedValue={addressCountry} onValueChange={(v) => { setAddressCountry(v); setAddressState(''); setAddressProvince(''); setAddressCity(''); }} style={{ flex: 1, color: '#111827' }}>
                    <Picker.Item label="Select country..." value="" />
                    {COUNTRIES.map((c) => <Picker.Item key={c} label={c} value={c} />)}
                  </Picker>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>{addressCountry === 'Philippines' ? 'Region' : addressCountry === 'United States' || addressCountry === 'Australia' ? 'State' : addressCountry === 'Canada' ? 'Province' : 'Region'}</Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker selectedValue={addressState} onValueChange={(v) => { setAddressState(v); setAddressProvince(''); setAddressCity(''); }} style={{ flex: 1, color: '#111827' }} enabled={!!addressCountry}>
                    <Picker.Item label={addressCountry ? 'Select...' : 'Select country first'} value="" />
                    {getProvincesForCountry(addressCountry).map((item) => <Picker.Item key={item} label={item} value={item} />)}
                  </Picker>
                </View>
              </View>

              {addressCountry === 'Philippines' && (
                <View style={{ gap: 6 }}>
                  <Text style={fieldLabelStyle}>Province</Text>
                  <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                    <Picker selectedValue={addressProvince} onValueChange={(v) => { setAddressProvince(v); setAddressCity(''); }} style={{ flex: 1, color: '#111827' }} enabled={!!addressState}>
                      <Picker.Item label={addressState ? 'Select province...' : 'Select region first'} value="" />
                      {getProvincesForRegion(addressState).map((p) => <Picker.Item key={p} label={p} value={p} />)}
                    </Picker>
                  </View>
                </View>
              )}

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>City</Text>
                <View style={[inputRowStyle, { paddingHorizontal: 0, paddingVertical: 0 }]}>
                  <Picker selectedValue={addressCity} onValueChange={setAddressCity} style={{ flex: 1, color: '#111827' }} enabled={addressCountry === 'Philippines' ? !!addressProvince : !!addressState}>
                    <Picker.Item label={addressCountry === 'Philippines' ? (addressProvince ? 'Select city...' : 'Select province first') : (addressState ? 'Select city...' : 'Select region first')} value="" />
                    {(addressCountry === 'Philippines' ? getCitiesForProvince(addressCountry, addressProvince) : getCitiesForProvince(addressCountry, addressState)).map((city) => <Picker.Item key={city} label={city} value={city} />)}
                  </Picker>
                </View>
              </View>

              <View style={{ gap: 6 }}>
                <Text style={fieldLabelStyle}>Postal code</Text>
                <View style={inputRowStyle}>
                  <TextInput style={inputStyle} placeholder="94102" placeholderTextColor="#9CA3AF" value={addressPostal} onChangeText={setAddressPostal} maxLength={20} />
                </View>
              </View>
            </View>
          </Card>

          {/* Company social links */}
          <Card title="Social links">
            <Text style={[S.hint, { marginBottom: 4 }]}>Company social media (optional)</Text>
            {companySocialLinks.map((link, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={[inputRowStyle, { flex: 1 }]}>
                  <MaterialCommunityIcons name="link-variant" size={15} color="#9CA3AF" />
                  <TextInput style={inputStyle} placeholder="https://..." placeholderTextColor="#9CA3AF" value={link} onChangeText={(v) => setCompanySocialLinks((prev) => prev.map((item, idx) => idx === index ? v : item))} keyboardType="url" autoCapitalize="none" autoCorrect={false} />
                </View>
                {index > 0 && (
                  <TouchableOpacity onPress={() => setCompanySocialLinks((prev) => prev.filter((_, idx) => idx !== index))}>
                    <MaterialCommunityIcons name="close-circle-outline" size={20} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity onPress={() => setCompanySocialLinks((prev) => [...prev, ''])} style={S.addRow}>
              <MaterialCommunityIcons name="plus-circle-outline" size={16} color="#7C3AED" />
              <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '600' }}>Add link</Text>
            </TouchableOpacity>
          </Card>
        </View>
      );

    // ── Company Docs ──────────────────────────────────────────────────────────
    case 'company_docs':
      return (
        <Card title="Verification documents">
          <Text style={S.hint}>Business license, tax ID, or incorporation documents. PDF/JPG/PNG. Min 1, max 5 files.</Text>
          <TouchableOpacity
            style={[S.uploadZone(verificationDocs.length > 0), { opacity: verificationDocs.length >= 5 ? 0.5 : 1 }]}
            onPress={async () => {
              if (verificationDocs.length >= 5) { setError('Maximum 5 documents allowed.'); return; }
              const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/jpeg', 'image/png'], multiple: false });
              if (!result.canceled && result.assets?.[0]) {
                const asset = result.assets[0];
                setVerificationDocs((prev) => prev.length >= 5 ? prev : [...prev, { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? null, size: asset.size }]);
              }
            }}
          >
            <MaterialCommunityIcons name="file-upload-outline" size={32} color={verificationDocs.length > 0 ? '#10B981' : '#7C3AED'} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: verificationDocs.length > 0 ? '#10B981' : '#111827' }}>
              {verificationDocs.length > 0 ? `${verificationDocs.length} file(s) selected` : 'Tap to upload document'}
            </Text>
            <Text style={S.hint}>PDF, JPG, PNG — max 5 files</Text>
          </TouchableOpacity>
          {verificationDocs.length > 0 && (
            <View style={{ gap: 8 }}>
              {verificationDocs.map((doc, index) => (
                <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#F3F4F6', borderRadius: 12, padding: 12 }}>
                  <MaterialCommunityIcons name="file-document-outline" size={18} color="#7C3AED" />
                  <Text style={{ flex: 1, fontSize: 13, color: '#111827' }} numberOfLines={1}>{doc.name}</Text>
                  <TouchableOpacity onPress={() => setVerificationDocs((prev) => prev.filter((_, idx) => idx !== index))}>
                    <MaterialCommunityIcons name="close-circle-outline" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F5F3FF', borderRadius: 12, padding: 12 }}>
            <MaterialCommunityIcons name="information-outline" size={15} color="#7C3AED" style={{ marginTop: 1 }} />
            <Text style={{ flex: 1, fontSize: 12, color: '#7C3AED', lineHeight: 18 }}>
              Submitting these documents will set your verification status to pending while our team reviews them.
            </Text>
          </View>
        </Card>
      );

    // ── Company Media ─────────────────────────────────────────────────────────
    case 'company_media':
      return (
        <View style={{ gap: 12 }}>
          <Card title="Company logo">
            <Text style={S.hint}>JPG or PNG, max 2 MB. Required.</Text>
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 8 }}>
              <TouchableOpacity
                onPress={async () => {
                  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                  if (!permission.granted) { setError('Permission to access photos is required.'); return; }
                  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1], quality: 0.8 });
                  if (!result.canceled && result.assets?.[0]) {
                    const asset = result.assets[0];
                    setLogoFile({ uri: asset.uri, name: asset.uri.split('/').pop() ?? 'logo.jpg', mimeType: asset.mimeType ?? null, size: asset.fileSize });
                  }
                }}
                style={{ width: 110, height: 110, borderRadius: 20, borderWidth: 2, borderStyle: 'dashed', borderColor: logoFile ? '#10B981' : '#E5E7EB', backgroundColor: logoFile ? '#F0FDF4' : '#F9FAFB', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
              >
                {logoFile
                  ? <Image source={{ uri: logoFile.uri }} style={{ width: 110, height: 110, borderRadius: 20 }} />
                  : <MaterialCommunityIcons name="image-plus" size={36} color="#7C3AED" />}
              </TouchableOpacity>
              {logoFile
                ? <Text style={{ fontSize: 13, color: '#10B981', fontWeight: '600' }}>{logoFile.name}</Text>
                : <Text style={S.hint}>Tap to upload logo</Text>}
              {logoFile && (
                <TouchableOpacity onPress={() => setLogoFile(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <MaterialCommunityIcons name="close-circle-outline" size={14} color="#EF4444" />
                  <Text style={{ fontSize: 12, color: '#EF4444' }}>Remove logo</Text>
                </TouchableOpacity>
              )}
            </View>
          </Card>

          <Card title="Office photos">
            <Text style={S.hint}>JPG or PNG. Min 1, max 6 images. Required.</Text>
            <TouchableOpacity
              style={[S.uploadZone(officeImages.length > 0), { opacity: officeImages.length >= 6 ? 0.5 : 1 }]}
              onPress={async () => {
                if (officeImages.length >= 6) { setError('Maximum 6 office images allowed.'); return; }
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) { setError('Permission to access photos is required.'); return; }
                const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsMultipleSelection: true, quality: 0.8 });
                if (!result.canceled && result.assets?.length) {
                  setOfficeImages((prev) => {
                    const remaining = 6 - prev.length;
                    if (remaining <= 0) return prev;
                    const next = result.assets.slice(0, remaining).map((asset) => ({ uri: asset.uri, name: asset.uri.split('/').pop() ?? 'office.jpg', mimeType: asset.mimeType ?? null, size: asset.fileSize }));
                    return [...prev, ...next];
                  });
                }
              }}
            >
              <MaterialCommunityIcons name="image-multiple-outline" size={32} color={officeImages.length > 0 ? '#10B981' : '#7C3AED'} />
              <Text style={{ fontSize: 14, fontWeight: '700', color: officeImages.length > 0 ? '#10B981' : '#111827' }}>
                {officeImages.length > 0 ? `${officeImages.length} photo(s) selected` : 'Tap to upload photos'}
              </Text>
              <Text style={S.hint}>JPG, PNG — max 6 images</Text>
            </TouchableOpacity>
            {officeImages.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {officeImages.map((image, index) => (
                  <View key={index} style={{ position: 'relative' }}>
                    <Image source={{ uri: image.uri }} style={{ width: 80, height: 80, borderRadius: 12 }} />
                    <TouchableOpacity onPress={() => setOfficeImages((prev) => prev.filter((_, idx) => idx !== index))} style={{ position: 'absolute', top: -6, right: -6, backgroundColor: '#fff', borderRadius: 10 }}>
                      <MaterialCommunityIcons name="close-circle" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </Card>
        </View>
      );

    default:
      return null;
  }
}