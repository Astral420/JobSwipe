import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { COUNTRIES, getProvincesForCountry, getProvincesForRegion, getCitiesForProvince } from '../../constants/locations';

interface EditBasicInfoSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; headline: string; country: string; region: string; province: string; city: string; street: string; about: string }) => Promise<void>;
  initialData: {
    name: string;
    headline: string;
    location: string;
    about: string;
  };
}

export function EditBasicInfoSheet({ visible, onClose, onSave, initialData }: EditBasicInfoSheetProps) {
  const T = useTheme();
  const [name, setName] = useState(initialData.name);
  const [headline, setHeadline] = useState(initialData.headline);
  const [country, setCountry] = useState('Philippines');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [about, setAbout] = useState(initialData.about);
  const [saving, setSaving] = useState(false);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showProvinceModal, setShowProvinceModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);

  const isPhilippines = country === 'Philippines';
  const availableRegionsOrStates = getProvincesForCountry(country);
  const availableProvinces = isPhilippines ? getProvincesForRegion(region) : [];
  const availableCities = isPhilippines
    ? getCitiesForProvince(country, province)
    : getCitiesForProvince(country, region);
  const filteredCountries = useMemo(() => {
    const query = countrySearch.trim().toLowerCase();
    if (!query) return COUNTRIES;
    return COUNTRIES.filter((item) => item.toLowerCase().includes(query));
  }, [countrySearch]);
  const inferPhilippineRegionFromProvince = (provinceName: string): string => {
    for (const candidateRegion of getProvincesForCountry('Philippines')) {
      if (getProvincesForRegion(candidateRegion).includes(provinceName)) {
        return candidateRegion;
      }
    }
    return '';
  };

  useEffect(() => {
    if (visible) {
      setName(initialData.name);
      setHeadline(initialData.headline);
      setAbout(initialData.about);
      setShowCountryModal(false);
      setCountrySearch('');
      setShowRegionModal(false);
      setShowProvinceModal(false);
      setShowCityModal(false);

      // Reset location fields before parsing to avoid stale values between openings.
      setCountry('Philippines');
      setRegion('');
      setProvince('');
      setCity('');
      setStreet('');

      // Parse location while supporting both:
      // - "Street, City, Province/Region, Country"
      // - "City, Province/Region, Country"
      // - "City, Country"
      const locationParts = initialData.location
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);

      if (locationParts.length === 0) return;

      const maybeCountry = locationParts[locationParts.length - 1];
      const hasCountry = COUNTRIES.includes(maybeCountry);
      const parsedCountry = hasCountry ? maybeCountry : 'Philippines';
      const partsWithoutCountry = hasCountry ? locationParts.slice(0, -1) : locationParts;
      const parsedIsPhilippines = parsedCountry === 'Philippines';

      setCountry(parsedCountry);

      if (partsWithoutCountry.length === 1) {
        setCity(partsWithoutCountry[0]);
      } else if (partsWithoutCountry.length === 2) {
        setCity(partsWithoutCountry[0]);
        if (parsedIsPhilippines) {
          const secondPart = partsWithoutCountry[1];
          const isRegionValue = getProvincesForRegion(secondPart).length > 0;
          if (isRegionValue) {
            setRegion(secondPart);
          } else {
            setProvince(secondPart);
            const inferredRegion = inferPhilippineRegionFromProvince(secondPart);
            if (inferredRegion) setRegion(inferredRegion);
          }
        } else {
          setRegion(partsWithoutCountry[1]);
        }
      } else {
        setStreet(partsWithoutCountry[0] || '');
        setCity(partsWithoutCountry[1] || '');
        if (parsedIsPhilippines) {
          const thirdPart = partsWithoutCountry[2] || '';
          const isRegionValue = getProvincesForRegion(thirdPart).length > 0;
          if (isRegionValue) {
            setRegion(thirdPart);
          } else {
            setProvince(thirdPart);
            const inferredRegion = inferPhilippineRegionFromProvince(thirdPart);
            if (inferredRegion) setRegion(inferredRegion);
          }
        } else {
          setRegion(partsWithoutCountry[2] || '');
        }
      }
    }
  }, [visible, initialData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ name, headline, country, region, province, city, street, about });
      onClose();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCountrySelect = (value: string) => {
    setCountry(value);
    setRegion('');
    setProvince('');
    setCity('');
    setShowCountryModal(false);
  };

  const handleRegionSelect = (value: string) => {
    setRegion(value);
    setProvince('');
    setCity('');
    setShowRegionModal(false);
  };

  const handleProvinceSelect = (value: string) => {
    setProvince(value);
    setCity('');
    setShowProvinceModal(false);
  };

  const handleCitySelect = (value: string) => {
    setCity(value);
    setShowCityModal(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView 
        style={{ flex: 1, justifyContent: 'flex-end' }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.handle, { backgroundColor: T.borderFaint }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: T.textPrimary }]}>Edit Basic Information</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            style={[styles.content, { flex: 1 }]}
            keyboardShouldPersistTaps="handled"
            disableScrollViewPanResponder={Platform.OS === 'ios'}
          >
            {/* Name */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>Full Name</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor={T.textHint}
              />
            </View>

            {/* Headline */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>Headline</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
                value={headline}
                onChangeText={setHeadline}
                placeholder="e.g. Senior Software Engineer"
                placeholderTextColor={T.textHint}
              />
            </View>

            {/* Country */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>Country</Text>
              <TouchableOpacity
                style={[styles.countrySelector, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
                onPress={() => setShowCountryModal(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.countrySelectorText, { color: country ? T.textPrimary : T.textHint }]}>
                  {country || 'Select country...'}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={T.textHint} />
              </TouchableOpacity>
            </View>

            {/* Region/State */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>
                {isPhilippines ? 'Region' : country === 'United States' || country === 'Australia' ? 'State' : country === 'Canada' ? 'Province' : 'Region'}
              </Text>
              <TouchableOpacity
                style={[
                  styles.countrySelector,
                  { backgroundColor: T.surfaceHigh, borderColor: T.border },
                  !country ? styles.selectorDisabled : null,
                ]}
                onPress={() => {
                  if (!country) return;
                  setShowRegionModal(true);
                }}
                activeOpacity={0.8}
                disabled={!country}
              >
                <Text style={[styles.countrySelectorText, { color: region ? T.textPrimary : T.textHint }]}>
                  {region || (country ? (isPhilippines ? 'Select region...' : 'Select...') : 'Select country first')}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={T.textHint} />
              </TouchableOpacity>
            </View>

            {/* Province (Philippines only) */}
            {isPhilippines && (
              <View style={styles.field}>
                <Text style={[styles.label, { color: T.textHint }]}>Province</Text>
                <TouchableOpacity
                  style={[
                    styles.countrySelector,
                    { backgroundColor: T.surfaceHigh, borderColor: T.border },
                    !region ? styles.selectorDisabled : null,
                  ]}
                  onPress={() => {
                    if (!region) return;
                    setShowProvinceModal(true);
                  }}
                  activeOpacity={0.8}
                  disabled={!region}
                >
                  <Text style={[styles.countrySelectorText, { color: province ? T.textPrimary : T.textHint }]}>
                    {province || (region ? 'Select province...' : 'Select region first')}
                  </Text>
                  <MaterialCommunityIcons name="chevron-down" size={20} color={T.textHint} />
                </TouchableOpacity>
              </View>
            )}

            {/* City */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>City</Text>
              <TouchableOpacity
                style={[
                  styles.countrySelector,
                  { backgroundColor: T.surfaceHigh, borderColor: T.border },
                  !(isPhilippines ? province : region) ? styles.selectorDisabled : null,
                ]}
                onPress={() => {
                  if (!(isPhilippines ? province : region)) return;
                  setShowCityModal(true);
                }}
                activeOpacity={0.8}
                disabled={!(isPhilippines ? province : region)}
              >
                <Text style={[styles.countrySelectorText, { color: city ? T.textPrimary : T.textHint }]}>
                  {city || (isPhilippines ? (province ? 'Select city...' : 'Select province first') : (region ? 'Select city...' : 'Select region first'))}
                </Text>
                <MaterialCommunityIcons name="chevron-down" size={20} color={T.textHint} />
              </TouchableOpacity>
            </View>

            {/* Street */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>Street / Building (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
                value={street}
                onChangeText={setStreet}
                placeholder="e.g. 123 Main Street, Building A"
                placeholderTextColor={T.textHint}
              />
            </View>

            {/* About */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: T.textHint }]}>About</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
                value={about}
                onChangeText={setAbout}
                placeholder="Tell us about yourself..."
                placeholderTextColor={T.textHint}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: T.surfaceHigh, borderColor: T.border }]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: T.textSub }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton, { backgroundColor: T.primary }]}
              onPress={handleSave}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: '#fff' }]}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {showCountryModal ? (
        <View style={styles.countryModalOverlay}>
          <TouchableOpacity
            style={styles.countryModalScrim}
            activeOpacity={1}
            onPress={() => setShowCountryModal(false)}
          />
          <View style={[styles.countryModalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.countryModalHeader}>
              <Text style={[styles.countryModalTitle, { color: T.textPrimary }]}>Select Country</Text>
              <TouchableOpacity onPress={() => setShowCountryModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.countrySearchInput, { backgroundColor: T.surfaceHigh, borderColor: T.border, color: T.textPrimary }]}
              value={countrySearch}
              onChangeText={setCountrySearch}
              placeholder="Search country..."
              placeholderTextColor={T.textHint}
              autoCapitalize="words"
              autoCorrect={false}
            />

            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {filteredCountries.length > 0 ? (
                filteredCountries.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.countryItem, { borderBottomColor: T.borderFaint }]}
                    onPress={() => handleCountrySelect(item)}
                  >
                    <Text style={[styles.countryItemText, { color: T.textPrimary }]}>{item}</Text>
                    {country === item ? (
                      <MaterialCommunityIcons name="check" size={18} color={T.primary} />
                    ) : null}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.countryEmptyState}>
                  <Text style={[styles.countryEmptyText, { color: T.textSub }]}>No countries found.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {showRegionModal ? (
        <View style={styles.countryModalOverlay}>
          <TouchableOpacity style={styles.countryModalScrim} activeOpacity={1} onPress={() => setShowRegionModal(false)} />
          <View style={[styles.countryModalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.countryModalHeader}>
              <Text style={[styles.countryModalTitle, { color: T.textPrimary }]}>
                {isPhilippines ? 'Select Region' : country === 'United States' || country === 'Australia' ? 'Select State' : country === 'Canada' ? 'Select Province' : 'Select Region'}
              </Text>
              <TouchableOpacity onPress={() => setShowRegionModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {availableRegionsOrStates.length > 0 ? (
                availableRegionsOrStates.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.countryItem, { borderBottomColor: T.borderFaint }]}
                    onPress={() => handleRegionSelect(item)}
                  >
                    <Text style={[styles.countryItemText, { color: T.textPrimary }]}>{item}</Text>
                    {region === item ? <MaterialCommunityIcons name="check" size={18} color={T.primary} /> : null}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.countryEmptyState}>
                  <Text style={[styles.countryEmptyText, { color: T.textSub }]}>No options available.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {showProvinceModal ? (
        <View style={styles.countryModalOverlay}>
          <TouchableOpacity style={styles.countryModalScrim} activeOpacity={1} onPress={() => setShowProvinceModal(false)} />
          <View style={[styles.countryModalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.countryModalHeader}>
              <Text style={[styles.countryModalTitle, { color: T.textPrimary }]}>Select Province</Text>
              <TouchableOpacity onPress={() => setShowProvinceModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {availableProvinces.length > 0 ? (
                availableProvinces.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.countryItem, { borderBottomColor: T.borderFaint }]}
                    onPress={() => handleProvinceSelect(item)}
                  >
                    <Text style={[styles.countryItemText, { color: T.textPrimary }]}>{item}</Text>
                    {province === item ? <MaterialCommunityIcons name="check" size={18} color={T.primary} /> : null}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.countryEmptyState}>
                  <Text style={[styles.countryEmptyText, { color: T.textSub }]}>No options available.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}

      {showCityModal ? (
        <View style={styles.countryModalOverlay}>
          <TouchableOpacity style={styles.countryModalScrim} activeOpacity={1} onPress={() => setShowCityModal(false)} />
          <View style={[styles.countryModalCard, { backgroundColor: T.surface, borderColor: T.border }]}>
            <View style={styles.countryModalHeader}>
              <Text style={[styles.countryModalTitle, { color: T.textPrimary }]}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityModal(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {availableCities.length > 0 ? (
                availableCities.map((item) => (
                  <TouchableOpacity
                    key={item}
                    style={[styles.countryItem, { borderBottomColor: T.borderFaint }]}
                    onPress={() => handleCitySelect(item)}
                  >
                    <Text style={[styles.countryItemText, { color: T.textPrimary }]}>{item}</Text>
                    {city === item ? <MaterialCommunityIcons name="check" size={18} color={T.primary} /> : null}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.countryEmptyState}>
                  <Text style={[styles.countryEmptyText, { color: T.textSub }]}>No options available.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  handle: { width: 38, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  content: { paddingHorizontal: 20, marginBottom: 16 },
  field: { marginBottom: 20 },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
  },
  textArea: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontWeight: '500',
    minHeight: 120,
  },
  pickerContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    height: 50,
  },
  countrySelector: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 50,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countrySelectorText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  countryModalOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  countryModalScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  countryModalCard: {
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: '72%',
    padding: 16,
  },
  countryModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  countryModalTitle: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  countrySearchInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
  },
  countryList: {
    flexGrow: 0,
  },
  countryItem: {
    minHeight: 44,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  countryItemText: {
    fontSize: 15,
    fontWeight: '500',
  },
  countryEmptyState: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  countryEmptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: { borderWidth: 1 },
  saveButton: {},
  buttonText: { fontSize: 15, fontWeight: '700', letterSpacing: 0.2 },
});
