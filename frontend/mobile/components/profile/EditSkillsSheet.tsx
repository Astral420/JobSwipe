import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, Modal, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

// Skill suggestions (same as registration)
const HARD_SKILL_SUGGESTIONS = [
  'React', 'React Native', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'C#', 'PHP', 'Ruby', 'Go',
  'SQL', 'PostgreSQL', 'MongoDB', 'GraphQL', 'REST APIs', 'AWS', 'Docker', 'Kubernetes', 'Git',
  'HTML', 'CSS', 'Tailwind CSS', 'Figma', 'UI Design', 'UX Research', 'Data Analysis', 'Machine Learning',
  'Excel', 'Financial Analysis', 'Accounting', 'Bookkeeping', 'Sales', 'Lead Generation', 'CRM',
  'Customer Support', 'Copywriting', 'Content Writing', 'SEO', 'Social Media Marketing',
  'Project Coordination', 'Recruitment', 'Training', 'Teaching', 'Lesson Planning',
  'Nursing', 'Patient Care', 'Medical Coding', 'Inventory Management', 'Logistics',
  'Operations Management', 'Procurement', 'AutoCAD', 'Video Editing', 'Photography', 'Public Speaking',
];

const SOFT_SKILL_SUGGESTIONS = [
  'Communication', 'Leadership', 'Problem Solving', 'Teamwork', 'Adaptability', 'Time Management',
  'Project Management', 'Critical Thinking', 'Creativity', 'Empathy', 'Collaboration',
  'Attention to Detail', 'Decision Making', 'Conflict Resolution', 'Negotiation', 'Resilience',
  'Work Ethic', 'Active Listening', 'Organization', 'Emotional Intelligence', 'Flexibility',
  'Accountability', 'Initiative',
];

interface EditSkillsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { hardSkills: string[]; softSkills: string[] }) => Promise<void>;
  initialData: {
    hardSkills: string[];
    softSkills: string[];
  };
}

export function EditSkillsSheet({ visible, onClose, onSave, initialData }: EditSkillsSheetProps) {
  const T = useTheme();
  const [hardSkills, setHardSkills] = useState<string[]>(initialData.hardSkills);
  const [softSkills, setSoftSkills] = useState<string[]>(initialData.softSkills);
  const [newHardSkill, setNewHardSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setHardSkills(initialData.hardSkills);
      setSoftSkills(initialData.softSkills);
    }
  }, [visible, initialData]);

  // Get filtered suggestions based on input
  const getFilteredSuggestions = (input: string, type: 'hard' | 'soft', selectedSkills: string[]) => {
    if (!input.trim()) return [];
    
    const suggestions = type === 'hard' ? HARD_SKILL_SUGGESTIONS : SOFT_SKILL_SUGGESTIONS;
    const normalizedInput = input.trim().toLowerCase();
    
    return suggestions
      .filter((skill) => {
        const normalizedSkill = skill.toLowerCase();
        return normalizedSkill.includes(normalizedInput) && 
               !selectedSkills.some((s) => s.toLowerCase() === normalizedSkill);
      })
      .slice(0, 6);
  };

  const hardSkillSuggestions = getFilteredSuggestions(newHardSkill, 'hard', hardSkills);
  const softSkillSuggestions = getFilteredSuggestions(newSoftSkill, 'soft', softSkills);

  const addHardSkill = (value?: string) => {
    const skillToAdd = value ?? newHardSkill;
    const trimmed = skillToAdd.trim();
    const normalized = trimmed.toLowerCase();
    
    if (trimmed && !hardSkills.some((skill) => skill.toLowerCase() === normalized)) {
      setHardSkills([...hardSkills, trimmed]);
      setNewHardSkill('');
    }
  };

  const removeHardSkill = (skill: string) => {
    setHardSkills(hardSkills.filter(s => s !== skill));
  };

  const addSoftSkill = (value?: string) => {
    const skillToAdd = value ?? newSoftSkill;
    const trimmed = skillToAdd.trim();
    const normalized = trimmed.toLowerCase();
    
    if (trimmed && !softSkills.some((skill) => skill.toLowerCase() === normalized)) {
      setSoftSkills([...softSkills, trimmed]);
      setNewSoftSkill('');
    }
  };

  const removeSoftSkill = (skill: string) => {
    setSoftSkills(softSkills.filter(s => s !== skill));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({ hardSkills, softSkills });
      onClose();
    } catch (err) {
      console.error('Save skills error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, justifyContent: 'flex-end' }}
      >
        <View style={[styles.sheet, { backgroundColor: T.surface, borderColor: T.border }]}>
          <View style={[styles.handle, { backgroundColor: T.borderFaint }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: T.textPrimary }]}>Edit Skills</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="close" size={20} color={T.textSub} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Hard Skills */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialCommunityIcons name="hammer-wrench" size={15} color={T.primary} />
              <Text style={[styles.sectionTitle, { color: T.textPrimary }]}>TECHNICAL SKILLS</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: T.textSub }]}>
              Programming languages, tools, frameworks, etc.
            </Text>

            {/* Input Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={[styles.inputRow, { flex: 1, backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
                <MaterialCommunityIcons name="tag-outline" size={15} color={T.textHint} />
                <TextInput
                  style={[styles.skillInput, { color: T.textPrimary }]}
                  value={newHardSkill}
                  onChangeText={setNewHardSkill}
                  placeholder="Excel, SQL, Figma..."
                  placeholderTextColor={T.textHint}
                  onSubmitEditing={() => addHardSkill()}
                  returnKeyType="done"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: T.primary }]}
                onPress={() => addHardSkill()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Suggestions */}
            {hardSkillSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
                {hardSkillSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => addHardSkill(suggestion)}
                    style={[
                      styles.suggestionRow,
                      { borderBottomWidth: index < hardSkillSuggestions.length - 1 ? 1 : 0, borderBottomColor: T.borderFaint }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color={T.primary} />
                      <Text style={[styles.suggestionText, { color: T.textPrimary }]}>{suggestion}</Text>
                    </View>
                    <MaterialCommunityIcons name="plus" size={15} color={T.textHint} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Skills List */}
            {hardSkills.length > 0 ? (
              <View style={styles.skillsContainer}>
                {hardSkills.map((skill) => (
                  <View key={skill} style={[styles.skillChip, { backgroundColor: T.primary + '18', borderColor: T.primary }]}>
                    <Text style={[styles.skillText, { color: T.primary }]}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeHardSkill(skill)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                      <MaterialCommunityIcons name="close" size={13} color={T.primary} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: T.textHint }]}>No technical skills added yet</Text>
            )}
          </View>

          {/* Soft Skills */}
          <View style={styles.section}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <MaterialCommunityIcons name="account-group-outline" size={15} color="#4ade80" />
              <Text style={[styles.sectionTitle, { color: T.textPrimary }]}>SOFT SKILLS</Text>
            </View>
            <Text style={[styles.sectionDesc, { color: T.textSub }]}>
              Communication, leadership, teamwork, etc.
            </Text>

            {/* Input Row */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
              <View style={[styles.inputRow, { flex: 1, backgroundColor: T.surfaceHigh, borderColor: T.border }]}>
                <MaterialCommunityIcons name="tag-outline" size={15} color={T.textHint} />
                <TextInput
                  style={[styles.skillInput, { color: T.textPrimary }]}
                  value={newSoftSkill}
                  onChangeText={setNewSoftSkill}
                  placeholder="Leadership, Empathy..."
                  placeholderTextColor={T.textHint}
                  onSubmitEditing={() => addSoftSkill()}
                  returnKeyType="done"
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: '#4ade80' }]}
                onPress={() => addSoftSkill()}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            {/* Suggestions */}
            {softSkillSuggestions.length > 0 && (
              <View style={[styles.suggestionsContainer, { backgroundColor: T.surface, borderColor: T.border }]}>
                {softSkillSuggestions.map((suggestion, index) => (
                  <TouchableOpacity
                    key={suggestion}
                    onPress={() => addSoftSkill(suggestion)}
                    style={[
                      styles.suggestionRow,
                      { borderBottomWidth: index < softSkillSuggestions.length - 1 ? 1 : 0, borderBottomColor: T.borderFaint }
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <MaterialCommunityIcons name="lightbulb-on-outline" size={14} color="#4ade80" />
                      <Text style={[styles.suggestionText, { color: T.textPrimary }]}>{suggestion}</Text>
                    </View>
                    <MaterialCommunityIcons name="plus" size={15} color={T.textHint} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Skills List */}
            {softSkills.length > 0 ? (
              <View style={styles.skillsContainer}>
                {softSkills.map((skill) => (
                  <View key={skill} style={[styles.skillChip, { backgroundColor: '#4ade8018', borderColor: '#4ade80' }]}>
                    <Text style={[styles.skillText, { color: '#4ade80' }]}>{skill}</Text>
                    <TouchableOpacity onPress={() => removeSoftSkill(skill)} hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}>
                      <MaterialCommunityIcons name="close" size={13} color="#4ade80" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: T.textHint }]}>No soft skills added yet</Text>
            )}
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
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sectionDesc: { fontSize: 13, marginBottom: 12 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skillInput: {
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  suggestionText: {
    fontSize: 13,
  },
  skillsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  skillChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  skillText: { fontSize: 13, fontWeight: '600' },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 8,
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
