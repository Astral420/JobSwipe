import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StatusBar, Text, TouchableOpacity, View, Animated, Easing } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ExpoLinking from 'expo-linking';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useTheme } from '../../theme';
import { Divider, Radii, SectionCard, Shadows, Spacer, Spacing, Typography } from '../../components/ui';
import { RegisterEmailGate } from '../../components/auth/register/RegisterEmailGate';
import { HRInviteRegistrationForm } from '../../components/auth/register/HRInviteRegistrationForm';
import { RegisterInviteCodeScreen } from '../../components/auth/register/RegisterInviteCodeScreen';
import { RegisterRoleSplash } from '../../components/auth/register/RegisterRoleSplash';
import { RegisterStepContent } from '../../components/auth/register/RegisterStepContent';
import { RegisterStepProgressBar } from '../../components/auth/register/RegisterStepProgressBar';
import { RegisterOtpVerificationScreen } from '../../components/auth/register/RegisterOtpVerificationScreen';
import { APPLICANT_STEPS, HARD_SKILL_SUGGESTIONS, HR_STEPS, JOB_TITLE_OPTIONS, Role, SOFT_SKILL_SUGGESTIONS, STEP_LABELS, Step, WorkEntry, EducationEntry } from '../../components/auth/register/types';

const OAUTH_APPLICANT_STEPS: Step[] = ['basic', 'resume', 'skills', 'experience', 'photo', 'social'];

type LocalUploadFile = {
  uri: string;
  name: string;
  mimeType?: string | null;
  size?: number;
};

// ─── Animated Orb (matches login page) ────────────────────────────────────────
function Orb({
  size,
  color,
  style,
  opacity,
  delay = 0,
}: {
  size: number;
  color: string;
  style?: object;
  opacity: number;
  delay?: number;
}) {
  const xy    = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(xy, {
            toValue: { x: 14, y: 20 },
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(xy, {
            toValue: { x: 0, y: 0 },
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 4500,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          opacity,
          transform: [
            { translateX: xy.x },
            { translateY: xy.y },
            { scale },
          ],
        },
        style,
      ]}
    />
  );
}

export default function RegisterScreen() {
  const T = useTheme();
  const { top: topInset, bottom: bottomInset } = useSafeAreaInsets();
  const setToken = useAuthStore((s) => s.setToken);
  const setOnboarding = useAuthStore((s) => s.setOnboarding);
  const GOOGLE_OAUTH_REDIRECT_ENDPOINT = 'http://localhost:8000/api/v1/auth/google/redirect';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role>('applicant');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [location, setLocation] = useState('');
  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationProvince, setLocationProvince] = useState('');
  const [locationCountry, setLocationCountry] = useState('');
  const [bio, setBio] = useState('');
  const [resumeFile, setResumeFile] = useState<LocalUploadFile | null>(null);
  const [hardSkills, setHardSkills] = useState<string[]>([]);
  const [softSkills, setSoftSkills] = useState<string[]>([]);
  const [hardSkillInput, setHardSkillInput] = useState('');
  const [softSkillInput, setSoftSkillInput] = useState('');
  const [workEntries, setWorkEntries] = useState<WorkEntry[]>([{ company: '', position: '', start_date: '', end_date: '', description: '' }]);
  const [educationEntries, setEducationEntries] = useState<EducationEntry[]>([{ school: '', degree: '', field_of_study: '', start_date: '', end_date: '' }]);
  const [photoFile, setPhotoFile] = useState<LocalUploadFile | null>(null);
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [twitterUrl, setTwitterUrl] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [companyTagline, setCompanyTagline] = useState('');
  const [companyDescription, setCompanyDescription] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [foundedYear, setFoundedYear] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressProvince, setAddressProvince] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [addressPostal, setAddressPostal] = useState('');
  const [companySocialLinks, setCompanySocialLinks] = useState<string[]>(['']);
  const [verificationDocs, setVerificationDocs] = useState<LocalUploadFile[]>([]);
  const [logoFile, setLogoFile] = useState<LocalUploadFile | null>(null);
  const [officeImages, setOfficeImages] = useState<LocalUploadFile[]>([]);

  const [roleSelected, setRoleSelected] = useState(false);
  const [emailDone, setEmailDone] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isOAuthOnboarding, setIsOAuthOnboarding] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorTimestamp, setErrorTimestamp] = useState<number>(0);
  const [detectedCompany, setDetectedCompany] = useState<{ name: string; validCodes: string[] } | null>(null);
  const [showInvitePrompt, setShowInvitePrompt] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [isInvitedHR, setIsInvitedHR] = useState(false);
  const [pendingAuthRole, setPendingAuthRole] = useState<'applicant' | 'hr' | 'company_admin' | null>(null);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
  const [hrFormData, setHrFormData] = useState<{
    firstName: string;
    lastName: string;
    jobTitle: string;
    password: string;
  } | null>(null);

  // Entrance animations (matches login)
  const heroOpacity  = useRef(new Animated.Value(0)).current;
  const heroSlide    = useRef(new Animated.Value(-24)).current;
  const sheetSlide   = useRef(new Animated.Value(80)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1, duration: 700, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0, duration: 700, delay: 100,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetSlide, {
        toValue: 0, duration: 700, delay: 300,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 1, duration: 500, delay: 300,
        easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const steps = role === 'applicant'
    ? (isOAuthOnboarding ? OAUTH_APPLICANT_STEPS : APPLICANT_STEPS)
    : HR_STEPS;
  const stepKey = steps[currentStep] || steps[0]; // Fallback to first step if currentStep is out of bounds
  const totalSteps = steps.length;
  const progress = (currentStep + 1) / totalSteps;

  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>[\]\\/\-_+=~`';]/.test(password);
  const hasMinLength = password.length >= 8;
  const strengthLevel =
    password.length === 0 
      ? null 
      : !hasMinLength || !hasUppercase || !hasNumber || !hasSpecialChar
        ? 'weak' 
        : password.length < 12 
          ? 'good' 
          : 'strong';
  const strengthColor = strengthLevel === 'weak' ? '#EF4444' : strengthLevel === 'good' ? '#F59E0B' : '#10B981';

  // Input styles now match the white sheet of the login page
  const inputRowStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing['2'],
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    borderRadius: 14,
    paddingHorizontal: Spacing['3'],
  };

  const inputStyle = {
    flex: 1,
    paddingVertical: Spacing['3'],
    fontSize: 14,
    color: '#111827',
    letterSpacing: -0.2,
  };

  const fieldLabelStyle = {
    fontSize: 10,
    fontWeight: '700' as any,
    color: '#9CA3AF',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginBottom: Spacing['2'],
  };

  const IMAGE_MIME_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
  };

  const DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };

  const getFileExtension = (value: string): string => {
    const cleanValue = value.split('?')[0];
    const fileName = cleanValue.split('/').pop() ?? cleanValue;
    const parts = fileName.split('.');
    return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
  };

  const inferMimeType = (file: LocalUploadFile, uploadType: 'image' | 'document'): string => {
    if (file.mimeType) return file.mimeType;
    const extension = getFileExtension(file.name) || getFileExtension(file.uri);
    if (uploadType === 'image') return IMAGE_MIME_BY_EXTENSION[extension] ?? 'image/jpeg';
    return DOCUMENT_MIME_BY_EXTENSION[extension] ?? 'application/pdf';
  };

  const isImageLikeFile = (file: LocalUploadFile): boolean => {
    if (file.mimeType?.startsWith('image/')) return true;
    const extension = getFileExtension(file.name) || getFileExtension(file.uri);
    return ['jpg', 'jpeg', 'png', 'webp'].includes(extension);
  };

  const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

  const isSupportedImageFile = (file: LocalUploadFile): boolean => {
    const extension = getFileExtension(file.name) || getFileExtension(file.uri);
    const normalizedMimeType = (file.mimeType ?? '').toLowerCase();
    const hasSupportedExtension = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension);
    const hasSupportedMime = normalizedMimeType === '' || IMAGE_MIME_TYPES.has(normalizedMimeType);
    return hasSupportedExtension && hasSupportedMime;
  };

  const uploadSingleFile = async (
    file: LocalUploadFile,
    uploadType: 'image' | 'document',
    retryCount = 0
  ): Promise<string> => {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 60000;

    try {
      if (uploadType === 'image' && !isSupportedImageFile(file)) {
        throw new Error('Unsupported image format. Please use JPG, PNG, WEBP, or HEIC.');
      }
      const fileName = file.name || `upload.${uploadType === 'image' ? 'jpg' : 'pdf'}`;
      const fileType = inferMimeType(file, uploadType);
      const localFileResponse = await fetchWithTimeout(file.uri, TIMEOUT_MS);
      const localFileBlob = await localFileResponse.blob();
      const fileSize = typeof file.size === 'number' && file.size > 0 ? file.size : localFileBlob.size;
      if (!fileSize || fileSize < 1) {
        throw new Error('Selected file appears empty. Please choose another file.');
      }
      const uploadMeta = await api.post('/files/upload-url', {
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        upload_type: uploadType,
      }) as { upload_url: string; public_url: string };
      const uploadResponse = await fetchWithTimeout(uploadMeta.upload_url, TIMEOUT_MS, {
        method: 'PUT',
        headers: { 'Content-Type': fileType },
        body: localFileBlob,
      });
      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }
      await api.post('/files/confirm-upload', { file_url: uploadMeta.public_url });
      return uploadMeta.public_url;
    } catch (err: any) {
      const isNetworkError = err.message?.includes('Network request failed') ||
                            err.message?.includes('timeout') ||
                            err.message?.includes('Upload failed') ||
                            err.name === 'AbortError';
      if (isNetworkError && retryCount < MAX_RETRIES) {
        const delay = Math.pow(2, retryCount) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return uploadSingleFile(file, uploadType, retryCount + 1);
      }
      if (retryCount >= MAX_RETRIES) {
        throw new Error(`Upload failed after ${MAX_RETRIES} attempts. Please check your connection.`);
      }
      throw err;
    }
  };

  const fetchWithTimeout = async (url: string, timeoutMs: number, options?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timeoutId);
      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error('Upload timeout - please check your connection and try again');
      }
      throw err;
    }
  };

  const addSkill = (type: 'hard' | 'soft', value?: string) => {
    const currentInput = type === 'hard' ? hardSkillInput : softSkillInput;
    const currentSkills = type === 'hard' ? hardSkills : softSkills;
    const setCurrentSkills = type === 'hard' ? setHardSkills : setSoftSkills;
    const setCurrentInput = type === 'hard' ? setHardSkillInput : setSoftSkillInput;
    const trimmed = (value ?? currentInput).trim();
    const normalized = trimmed.toLowerCase();
    if (trimmed && !currentSkills.some((skill) => skill.toLowerCase() === normalized)) {
      setCurrentSkills((prev) => [...prev, trimmed]);
    }
    setCurrentInput('');
  };

  const removeSkill = (type: 'hard' | 'soft', skill: string) => {
    const setCurrentSkills = type === 'hard' ? setHardSkills : setSoftSkills;
    setCurrentSkills((prev) => prev.filter((item) => item !== skill));
  };

  const getFilteredSkillSuggestions = (type: 'hard' | 'soft', input: string, selectedSkills: string[]) =>
    input.trim()
      ? (type === 'hard' ? HARD_SKILL_SUGGESTIONS : SOFT_SKILL_SUGGESTIONS).filter((skill) => {
        const normalizedSkill = skill.toLowerCase();
        const normalizedInput = input.trim().toLowerCase();
        return normalizedSkill.includes(normalizedInput) && !selectedSkills.some((s) => s.toLowerCase() === normalizedSkill);
      }).slice(0, 6)
      : [];

  const hardSkillSuggestions = getFilteredSkillSuggestions('hard', hardSkillInput, hardSkills);
  const softSkillSuggestions = getFilteredSkillSuggestions('soft', softSkillInput, softSkills);
  const normalizedWorkEntries = workEntries.filter((entry) =>
    [entry.company, entry.position, entry.start_date, entry.end_date, entry.description].some((v) => v.trim() !== '')
  );
  const normalizedEducationEntries = educationEntries.filter((entry) =>
    [entry.school, entry.degree, entry.field_of_study, entry.start_date, entry.end_date].some((v) => v.trim() !== '')
  );
  const normalizedSocialLinks = {
    ...(linkedinUrl.trim().startsWith('https://') ? { linkedin: linkedinUrl.trim() } : {}),
    ...(githubUrl.trim().startsWith('https://') ? { github: githubUrl.trim() } : {}),
    ...(portfolioUrl.trim().startsWith('https://') ? { portfolio: portfolioUrl.trim() } : {}),
    ...(twitterUrl.trim().startsWith('https://') ? { twitter: twitterUrl.trim() } : {}),
  };

  const searchParams = useLocalSearchParams<{
    token?: string;
    needs_onboarding?: string;
    error?: string;
    message?: string;
  }>();

  useEffect(() => {
    const handleOAuthParams = async () => {
      const { token, needs_onboarding, error: oauthError, message: oauthMessage } = searchParams;
      if (oauthError) {
        setError(oauthMessage || 'Google sign-up could not be completed.');
        setGoogleLoading(false);
        return;
      }
      if (!token) return;
      const needsOnboarding = needs_onboarding === '1' || needs_onboarding === 'true';
      setError('');
      setGoogleLoading(false);
      if (needsOnboarding) {
        setOnboarding(true);
        setIsOAuthOnboarding(true);
        await setToken(token, 'applicant');
        setRoleSelected(true);
        setEmailDone(true);
        setOtpSent(false);
        setCurrentStep(0);
        return;
      }
      await setToken(token, 'applicant');
      router.replace('/(tabs)');
    };
    void handleOAuthParams();
  }, [searchParams.token]);

  const validateCurrentStep = () => {
    setError('');
    if (stepKey === 'password') {
      if (!password || !confirmPassword) return setError('Please fill in all fields.'), false;
      if (password !== confirmPassword) return setError('Passwords do not match.'), false;
      if (!hasMinLength) return setError('Password must be at least 8 characters.'), false;
      if (!hasUppercase) return setError('Password must contain at least 1 uppercase letter.'), false;
      if (!hasNumber) return setError('Password must contain at least 1 number.'), false;
      if (!hasSpecialChar) return setError('Password must contain at least 1 special character (!@#$%^&*(),.?":{}|<>[]\\/-_+=~`\';).'), false;
    }
    if (stepKey === 'basic' && (!firstName || !lastName || !location)) return setError('First name, last name, and location are required.'), false;
    if (stepKey === 'resume' && !resumeFile) return setError('Please upload your resume before continuing.'), false;
    if (stepKey === 'skills' && hardSkills.length + softSkills.length === 0) return setError('Please add at least one hard or soft skill.'), false;
    if (stepKey === 'company_details') {
      if (!companyName) return setError('Company name is required.'), false;
      if (companyName.length < 2 || companyName.length > 100) return setError('Company name must be 2-100 characters.'), false;
      if (!companyDescription) return setError('Company description is required.'), false;
      if (companyDescription.length < 50 || companyDescription.length > 2000) return setError('Description must be 50-2000 characters.'), false;
      if (!companyIndustry) return setError('Please select an industry.'), false;
      if (!companySize) return setError('Please select a company size.'), false;
    }
    if (stepKey === 'company_docs' && verificationDocs.length === 0) return setError('Please upload at least one verification document.'), false;
    if (stepKey === 'company_media') {
      if (!logoFile) return setError('Please upload a company logo.'), false;
      if (officeImages.length === 0) return setError('Please upload at least one office image.'), false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (role === 'applicant') {
      setLoading(true);
      try {
        setPendingAuthRole('applicant');
        await api.post('/auth/register', { email, password, role, company_invite_token: null });
        setError('');
        setOtpCode('');
        setOtpSent(true);
      } catch (err: any) {
        setError(err?.message || 'Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    try {
      const registrationRole: 'hr' | 'company_admin' = isInvitedHR ? 'hr' : 'company_admin';
      setPendingAuthRole(registrationRole);
      const data = await api.post('/auth/register', {
        email,
        password,
        role: registrationRole,
        company_invite_token: inviteCode || null,
      }) as { token?: string; user?: { role?: string } };

      if (data?.token) {
        const nextRole: 'hr' | 'company_admin' = data.user?.role === 'company_admin'
          ? 'company_admin'
          : data.user?.role === 'hr'
            ? 'hr'
            : registrationRole;
        await setToken(data.token, nextRole);
        if (nextRole === 'company_admin') {
          setOnboarding(true);
          await completeCompanyOnboarding();
          await new Promise(resolve => setTimeout(resolve, 1000));
          setOnboarding(false);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace('/(company-tabs)');
        return;
      }
      setError('');
      setOtpCode('');
      setOtpSent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not connect to server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!validateCurrentStep()) return;
    if (currentStep < totalSteps - 1) {
      setCurrentStep((v) => v + 1);
    } else if (isOAuthOnboarding) {
      setLoading(true);
      try {
        await completeApplicantOnboarding();
        setOnboarding(false);
        setIsOAuthOnboarding(false);
        router.replace('/(tabs)');
      } catch (err: any) {
        const message = err?.message || err?.error || 'Could not complete onboarding. Please try again.';
        setError(`Onboarding error: ${message}`);
      } finally {
        setLoading(false);
      }
    } else {
      handleSubmit();
    }
  };

  const completeApplicantOnboarding = async () => {
    let resumeUrl: string | null = null;
    let profilePhotoUrl: string | null = null;
    if (resumeFile) {
      setUploadProgress({ current: 1, total: (resumeFile ? 1 : 0) + (photoFile ? 1 : 0), fileName: 'Resume' });
      resumeUrl = await uploadSingleFile(resumeFile, 'document');
    }
    if (photoFile) {
      setUploadProgress({ current: (resumeFile ? 2 : 1), total: (resumeFile ? 1 : 0) + (photoFile ? 1 : 0), fileName: 'Profile Photo' });
      profilePhotoUrl = await uploadSingleFile(photoFile, 'image');
    }
    setUploadProgress(null);
    const stepPayloads = [
      { step: 1, step_data: { first_name: firstName, last_name: lastName, location, location_city: locationCity || null, location_region: locationRegion || null, bio: bio || null } },
      { step: 2, step_data: { resume_url: resumeUrl } },
      { step: 3, step_data: { hard_skills: hardSkills, soft_skills: softSkills } },
      { step: 4, step_data: { work_experience: normalizedWorkEntries, education: normalizedEducationEntries } },
      { step: 5, step_data: { profile_photo_url: profilePhotoUrl } },
      { step: 6, step_data: { social_links: normalizedSocialLinks } },
    ];
    for (const payload of stepPayloads) {
      await api.post('/profile/onboarding/complete-step', payload);
    }
  };

  const completeCompanyOnboarding = async () => {
    const onboardingStatus = await api.get('/profile/onboarding/status') as { onboarding_step?: number | string };
    const rawStep = onboardingStatus?.onboarding_step;
    const currentOnboardStep = rawStep === 'completed'
      ? 4
      : typeof rawStep === 'number'
        ? rawStep
        : Number.parseInt(String(rawStep ?? '1'), 10) || 1;

    if (currentOnboardStep <= 1) {
      await api.post('/profile/onboarding/complete-step', {
        step: 1,
        step_data: {
          company_name: companyName,
          tagline: companyTagline || null,
          description: companyDescription,
          industry: companyIndustry,
          company_size: companySize,
          founded_year: foundedYear ? parseInt(foundedYear, 10) : null,
          website_url: websiteUrl || null,
          address: {
            street: addressStreet || null,
            city: addressCity || null,
            state: (addressCountry === 'Philippines' ? (addressProvince || addressState) : addressState) || null,
            region: addressState || null,
            province: addressProvince || null,
            country: addressCountry || null,
            postal_code: addressPostal || null,
          },
          social_links: companySocialLinks.filter(Boolean),
        },
      });
    }

    if (currentOnboardStep <= 2) {
      const verificationDocumentUrls: string[] = [];
      const failedDocs: string[] = [];
      const totalDocs = verificationDocs.length;
      for (let i = 0; i < totalDocs; i++) {
        const file = verificationDocs[i];
        setUploadProgress({ current: i + 1, total: totalDocs, fileName: file.name });
        try {
          const url = await uploadSingleFile(file, isImageLikeFile(file) ? 'image' : 'document');
          verificationDocumentUrls.push(url);
        } catch {
          failedDocs.push(file.name);
        }
      }
      setUploadProgress(null);
      if (failedDocs.length > 0) throw new Error(`Failed to upload verification documents: ${failedDocs.join(', ')}`);
      await api.post('/profile/onboarding/complete-step', { step: 2, step_data: { verification_documents: verificationDocumentUrls } });
    }

    if (currentOnboardStep <= 3) {
      let logoUrl: string | null = null;
      if (logoFile) {
        setUploadProgress({ current: 1, total: 1 + officeImages.length, fileName: 'Company Logo' });
        try {
          logoUrl = await uploadSingleFile(logoFile, 'image');
        } catch {
          setUploadProgress(null);
          throw new Error('Failed to upload company logo. Please try again.');
        }
      }
      const officeImageUrls: string[] = [];
      const failedImages: string[] = [];
      const totalImages = officeImages.length;
      const startIndex = logoFile ? 2 : 1;
      for (let i = 0; i < totalImages; i++) {
        const file = officeImages[i];
        setUploadProgress({ current: startIndex + i, total: (logoFile ? 1 : 0) + totalImages, fileName: `Office Image ${i + 1}` });
        try {
          const url = await uploadSingleFile(file, 'image');
          officeImageUrls.push(url);
        } catch {
          failedImages.push(`Image ${i + 1}`);
        }
      }
      setUploadProgress(null);
      if (failedImages.length > 0) throw new Error(`Failed to upload office images: ${failedImages.join(', ')}`);
      await api.post('/profile/onboarding/complete-step', { step: 3, step_data: { logo_url: logoUrl, office_images: officeImageUrls } });
    }
  };

  const handleVerifyOtp = async () => {
    if (otpCode.trim().length !== 6) {
      setError('Please enter the 6-digit code sent to your email.');
      setErrorTimestamp(Date.now());
      return;
    }
    setOtpLoading(true);
    try {
      const data = await api.post('/auth/verify-email', { email, code: otpCode.trim() }) as { token?: string; user?: { role?: string } };
      const token = data?.token;
      if (!token) {
        setError('Verification succeeded, but no session token was returned.');
        setErrorTimestamp(Date.now());
        return;
      }
      const fallbackCompanyRole: 'hr' | 'company_admin' = isInvitedHR ? 'hr' : 'company_admin';
      const resolvedRole = data.user?.role === 'company_admin'
        ? 'company_admin'
        : data.user?.role === 'hr'
          ? 'hr'
          : pendingAuthRole === 'company_admin'
            ? 'company_admin'
            : pendingAuthRole === 'hr'
              ? 'hr'
              : role === 'hr'
                ? fallbackCompanyRole
                : 'applicant';
      await setToken(token, resolvedRole);
      if (resolvedRole === 'applicant') {
        try { await completeApplicantOnboarding(); } catch { /* account verified, continue */ }
        setOnboarding(false);
        router.replace('/(tabs)');
      } else {
        if (resolvedRole === 'company_admin') {
          setOnboarding(true);
          await completeCompanyOnboarding();
          await new Promise(resolve => setTimeout(resolve, 1000));
          setOnboarding(false);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        router.replace('/(company-tabs)');
      }
    } catch (err: any) {
      setError(err?.message || 'Could not complete verification. Please try again.');
      setErrorTimestamp(Date.now());
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendLoading(true);
    try {
      await api.post('/auth/resend-verification', { email });
      setError('');
    } catch (err: any) {
      setError(err?.message || 'Could not resend the verification code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleGoogleRegister = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const response = await fetch(GOOGLE_OAUTH_REDIRECT_ENDPOINT);
      const data = await response.json();
      const redirectUrl = data?.data?.redirect_url;
      if (!data?.success || !redirectUrl) {
        setError(data?.message || 'Could not start Google registration. Please try again.');
        return;
      }
      const canOpen = await ExpoLinking.canOpenURL(redirectUrl);
      if (!canOpen) {
        setError('Google registration is not available on this device.');
        return;
      }
      await ExpoLinking.openURL(redirectUrl);
    } catch {
      setError('Could not start Google registration. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const resetForm = () => {
    setEmailDone(false); setOtpSent(false); setOtpCode(''); setEmail(''); setPassword('');
    setConfirmPassword(''); setShowPassword(false); setRole('applicant'); setFirstName('');
    setLastName(''); setLocation(''); setLocationCity(''); setLocationRegion('');
    setLocationProvince(''); setLocationCountry(''); setBio(''); setResumeFile(null);
    setHardSkills([]); setSoftSkills([]); setHardSkillInput(''); setSoftSkillInput('');
    setWorkEntries([{ company: '', position: '', start_date: '', end_date: '', description: '' }]);
    setEducationEntries([{ school: '', degree: '', field_of_study: '', start_date: '', end_date: '' }]);
    setPhotoFile(null); setLinkedinUrl(''); setGithubUrl(''); setPortfolioUrl(''); setTwitterUrl('');
    setCompanyName(''); setCompanyTagline(''); setCompanyDescription(''); setCompanyIndustry('');
    setCompanySize(''); setFoundedYear(''); setWebsiteUrl(''); setAddressStreet('');
    setAddressCity(''); setAddressState(''); setAddressProvince(''); setAddressCountry('');
    setAddressPostal(''); setCompanySocialLinks(['']); setVerificationDocs([]); setLogoFile(null);
    setOfficeImages([]); setCurrentStep(0); setGoogleLoading(false); setOtpLoading(false);
    setResendLoading(false); setError(''); setDetectedCompany(null); setShowInvitePrompt(false);
    setInviteCode(''); setInviteError(''); setIsInvitedHR(false); setPendingAuthRole(null);
  };

  // ── Delegate screens that have their own full UI ────────────────────────────
  if (!roleSelected) {
    return <RegisterRoleSplash T={T} topInset={topInset} bottomInset={bottomInset} role={role} setRole={setRole} onContinue={() => setRoleSelected(true)} />;
  }

  if (showInvitePrompt) {
    return (
      <RegisterInviteCodeScreen
        T={T} topInset={topInset} inviteCode={inviteCode} inviteError={inviteError}
        detectedCompany={detectedCompany} fieldLabelStyle={fieldLabelStyle}
        inputRowStyle={inputRowStyle} inputStyle={inputStyle}
        onBack={() => { setShowInvitePrompt(false); setInviteCode(''); setInviteError(''); }}
        onChangeInviteCode={(value) => { setInviteCode(value); setInviteError(''); }}
        onVerify={async () => {
          if (!inviteCode.trim()) { setInviteError('Please enter your invite code.'); return; }
          
          // If we have HR form data, this is the final step - register the user
          if (hrFormData) {
            setLoading(true);
            try {
              // Validate invite code
              const validationData = await api.post('/company/invites/validate', { email, token: inviteCode.trim() }) as { company_name: string; role: string; valid: boolean };
              if (!validationData.valid) {
                setInviteError('Invalid invite code. Please check with your company admin.');
                setLoading(false);
                return;
              }

              // Register with the saved form data
              const data = await api.post('/auth/register', {
                email,
                password: hrFormData.password,
                role: 'hr',
                company_invite_token: inviteCode.trim(),
              }) as unknown as { token?: string };

              if (data?.token) {
                await setToken(data.token, 'hr');
                router.replace('/(company-tabs)');
              } else {
                setOtpSent(true);
                setShowInvitePrompt(false);
              }
            } catch (err: any) {
              setInviteError(err?.message || 'Invalid invite code. Please check with your company admin.');
            } finally {
              setLoading(false);
            }
          } else {
            // Original flow - just validate and show HR form
            try {
              const data = await api.post('/company/invites/validate', { email, token: inviteCode.trim() }) as { company_name: string; role: string; valid: boolean };
              if (data.valid) {
                setDetectedCompany({ name: data.company_name, validCodes: [] });
                setIsInvitedHR(true); setShowInvitePrompt(false); setEmailDone(true);
              } else { setInviteError('Invalid invite code. Please check with your company admin.'); }
            } catch { setInviteError('Invalid invite code. Please check with your company admin.'); }
          }
        }}
        onRequestInvite={() => {
          setInviteError('');
          alert(`Contact your ${detectedCompany ? detectedCompany.name : 'company'} admin to receive an invite link to your work email.`);
        }}
      />
    );
  }

  if (otpSent) {
    return (
      <RegisterOtpVerificationScreen
        T={T} topInset={topInset} bottomInset={bottomInset} email={email} code={otpCode} error={error}
        errorTimestamp={errorTimestamp}
        helperMessage={uploadProgress ? `Uploading ${uploadProgress.fileName} (${uploadProgress.current}/${uploadProgress.total})...` : undefined}
        verifying={otpLoading} resending={resendLoading} fieldLabelStyle={fieldLabelStyle}
        inputRowStyle={inputRowStyle} inputStyle={inputStyle}
        onBack={() => { setOtpSent(false); setOtpCode(''); setError(''); }}
        onChangeCode={setOtpCode}
        onVerify={() => { void handleVerifyOtp(); }}
        onResend={() => { void handleResendOtp(); }}
      />
    );
  }

  if (isInvitedHR && emailDone && !showInvitePrompt) {
    return (
      <HRInviteRegistrationForm
        T={T} topInset={topInset} bottomInset={bottomInset} email={email} detectedCompany={detectedCompany}
        fieldLabelStyle={fieldLabelStyle} inputRowStyle={inputRowStyle} inputStyle={inputStyle}
        jobTitleOptions={JOB_TITLE_OPTIONS} setToken={setToken}
        onOtpSent={() => { setError(''); setOtpCode(''); setIsInvitedHR(false); setOtpSent(true); }}
        onBack={() => { setEmailDone(false); setIsInvitedHR(false); setInviteCode(''); setInviteError(''); setShowInvitePrompt(false); setHrFormData(null); }}
        onNeedInviteCode={(formData) => {
          // Save form data and show invite code screen
          setHrFormData(formData);
          setShowInvitePrompt(true);
        }}
      />
    );
  }

  if (!emailDone) {
    return (
      <RegisterEmailGate
        T={T} topInset={topInset} bottomInset={bottomInset} role={role} email={email} error={error}
        googleLoading={googleLoading} fieldLabelStyle={fieldLabelStyle}
        inputRowStyle={inputRowStyle} inputStyle={inputStyle}
        onBack={() => { resetForm(); setRoleSelected(false); }}
        onChangeEmail={setEmail}
        onGoogleRegister={() => { void handleGoogleRegister(); }}
        onContinue={async () => {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!email) { setError('Please enter your email address.'); return; }
          if (!emailRegex.test(email)) { setError('Please enter a valid email address.'); return; }
          
          // For company/HR role, check if email domain already has a company
          if (role === 'hr') {
            setLoading(true);
            try {
              console.log('Checking company domain for email:', email);
              const result = await api.post('/auth/check-company-domain', { email }) as { 
                company_exists: boolean; 
                company_name?: string; 
                requires_invite: boolean 
              };
              
              console.log('Company domain check result:', result);
              
              if (result.company_exists && result.requires_invite) {
                // Company exists - go directly to HR invite form (skip invite code screen)
                console.log('Company exists, going to HR invite form');
                const companyName = result.company_name || 'this company';
                setDetectedCompany({ name: companyName, validCodes: [] });
                setIsInvitedHR(true);
                setEmailDone(true); // This will show the HR invite form
                setError('');
                setLoading(false);
                return;
              } else {
                // No company exists - proceed to normal company admin registration
                console.log('No company exists, proceeding to company admin registration');
                setError('');
                setEmailDone(true);
              }
            } catch (err: any) {
              // On error, proceed to normal registration flow
              console.error('Error checking company domain:', err);
              console.error('Error details:', JSON.stringify(err, null, 2));
              setError('');
              setEmailDone(true);
            } finally {
              setLoading(false);
            }
          } else {
            setError('');
            setEmailDone(true);
          }
        }}
        onInviteCode={() => { setError(''); setEmail(''); setShowInvitePrompt(true); }}
      />
    );
  }

  const isLastStep = currentStep === totalSteps - 1;

  // Safety check: Don't render multi-step UI if email is not done
  if (!emailDone) {
    return null;
  }

  // ── Main multi-step registration UI — dark + white sheet like login ─────────
  return (
    <View style={{ flex: 1, backgroundColor: '#0D0520', overflow: 'hidden' }}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Orbs — identical to login page */}
      <Orb size={320} color="#7C3AED" opacity={0.5} delay={0}    style={{ top: -120, left: -80 }} />
      <Orb size={240} color="#EC4899" opacity={0.4} delay={500}  style={{ top: -60,  right: -80 }} />
      <Orb size={160} color="#A855F7" opacity={0.3} delay={1000} style={{ top: 220,  left: 40 }} />

      {/* Hero — logo + headline in the dark zone */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: topInset + 40,
          paddingHorizontal: 28,
          opacity: heroOpacity,
          transform: [{ translateY: heroSlide }],
        }}
      >
        {/* Logo */}
        <View style={{ marginBottom: 20 }}>
          <View style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.18)',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 14,
          }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800' }}>J</Text>
          </View>
          <Text style={{
            fontSize: 12,
            fontWeight: '600',
            color: 'rgba(255,255,255,0.45)',
            letterSpacing: 2.5,
            textTransform: 'uppercase',
          }}>
            JobSwipe
          </Text>
        </View>

        <Text style={{
          fontSize: 34,
          fontWeight: '800',
          color: '#fff',
          lineHeight: 38,
          letterSpacing: -1.2,
          marginBottom: 8,
        }}>
          {role === 'applicant' ? 'Create your\n' : 'Set up your\n'}
          <Text style={{ color: '#C084FC' }}>
            {role === 'applicant' ? 'profile.' : 'company.'}
          </Text>
        </Text>
      </Animated.View>

      {/* White sheet — slides up from bottom, contains all form content */}
      <KeyboardAvoidingView
        style={{ flex: 1, justifyContent: 'flex-end' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View style={{
          backgroundColor: '#fff',
          borderTopLeftRadius: 32,
          borderTopRightRadius: 32,
          maxHeight: '72%',
          transform: [{ translateY: sheetSlide }],
          opacity: sheetOpacity,
        }}>
          {/* Drag handle */}
          <View style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: '#E5E7EB',
            alignSelf: 'center',
            marginTop: 12,
            marginBottom: 4,
          }} />

          {/* Back button row */}
          <View style={{ paddingHorizontal: 24, paddingTop: 8, paddingBottom: 4 }}>
            <TouchableOpacity
              onPress={() => {
                if (currentStep === 0) {
                  if (isOAuthOnboarding) {
                    setOnboarding(false); setIsOAuthOnboarding(false); resetForm(); setRoleSelected(false);
                  } else {
                    setError(''); setEmailDone(false);
                  }
                } else {
                  setError(''); setCurrentStep((v) => v - 1);
                }
              }}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}
              activeOpacity={0.7}
            >
              <MaterialCommunityIcons name="arrow-left" size={18} color="#9CA3AF" />
              <Text style={{ fontSize: 13, color: '#9CA3AF', fontWeight: '600' }}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Step Progress Bar */}
          <RegisterStepProgressBar
            T={T}
            currentStep={currentStep}
            totalSteps={totalSteps}
            progress={progress}
            steps={steps}
            stepKey={stepKey}
            stepLabels={STEP_LABELS}
          />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: Math.max(bottomInset, 24) + 32, gap: 16 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Step label */}
            <Text style={{ fontSize: 20, fontWeight: '800', color: '#111827', letterSpacing: -0.5 }}>
              {STEP_LABELS[stepKey] ?? 'Complete your profile'}
            </Text>

            {/* Error banner — styled to match login */}
            {!!error && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                gap: 10,
                backgroundColor: '#FEF2F2',
                borderWidth: 1,
                borderColor: '#FECACA',
                borderRadius: 12,
                padding: 14,
              }}>
                <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginTop: 1 }} />
                <Text style={{ flex: 1, fontSize: 13, color: '#EF4444', lineHeight: 20 }}>{error}</Text>
              </View>
            )}

            {/* Step content — pass white-sheet-compatible styles */}
            <RegisterStepContent
              T={T}
              stepKey={stepKey}
              fieldLabelStyle={fieldLabelStyle}
              inputRowStyle={inputRowStyle}
              inputStyle={inputStyle}
              password={password}
              confirmPassword={confirmPassword}
              showPassword={showPassword}
              setPassword={setPassword}
              setConfirmPassword={setConfirmPassword}
              setShowPassword={setShowPassword}
              strengthLevel={strengthLevel}
              strengthColor={strengthColor}
              firstName={firstName}
              lastName={lastName}
              location={location}
              locationCity={locationCity}
              locationRegion={locationRegion}
              locationProvince={locationProvince}
              locationCountry={locationCountry}
              bio={bio}
              setFirstName={setFirstName}
              setLastName={setLastName}
              setLocation={setLocation}
              setLocationCity={setLocationCity}
              setLocationRegion={setLocationRegion}
              setLocationProvince={setLocationProvince}
              setLocationCountry={setLocationCountry}
              setBio={setBio}
              resumeFile={resumeFile}
              setResumeFile={setResumeFile}
              hardSkills={hardSkills}
              softSkills={softSkills}
              hardSkillInput={hardSkillInput}
              softSkillInput={softSkillInput}
              setHardSkillInput={setHardSkillInput}
              setSoftSkillInput={setSoftSkillInput}
              addSkill={addSkill}
              removeSkill={removeSkill}
              hardSkillSuggestions={hardSkillSuggestions}
              softSkillSuggestions={softSkillSuggestions}
              workEntries={workEntries}
              setWorkEntries={setWorkEntries}
              educationEntries={educationEntries}
              setEducationEntries={setEducationEntries}
              photoFile={photoFile}
              setPhotoFile={setPhotoFile}
              linkedinUrl={linkedinUrl}
              githubUrl={githubUrl}
              portfolioUrl={portfolioUrl}
              twitterUrl={twitterUrl}
              setLinkedinUrl={setLinkedinUrl}
              setGithubUrl={setGithubUrl}
              setPortfolioUrl={setPortfolioUrl}
              setTwitterUrl={setTwitterUrl}
              companyName={companyName}
              companyTagline={companyTagline}
              companyDescription={companyDescription}
              companyIndustry={companyIndustry}
              companySize={companySize}
              foundedYear={foundedYear}
              websiteUrl={websiteUrl}
              addressStreet={addressStreet}
              addressCity={addressCity}
              addressState={addressState}
              addressProvince={addressProvince}
              addressCountry={addressCountry}
              addressPostal={addressPostal}
              companySocialLinks={companySocialLinks}
              setCompanyName={setCompanyName}
              setCompanyTagline={setCompanyTagline}
              setCompanyDescription={setCompanyDescription}
              setCompanyIndustry={setCompanyIndustry}
              setCompanySize={setCompanySize}
              setFoundedYear={setFoundedYear}
              setWebsiteUrl={setWebsiteUrl}
              setAddressStreet={setAddressStreet}
              setAddressCity={setAddressCity}
              setAddressState={setAddressState}
              setAddressProvince={setAddressProvince}
              setAddressCountry={setAddressCountry}
              setAddressPostal={setAddressPostal}
              setCompanySocialLinks={setCompanySocialLinks}
              verificationDocs={verificationDocs}
              setVerificationDocs={setVerificationDocs}
              logoFile={logoFile}
              setLogoFile={setLogoFile}
              officeImages={officeImages}
              setOfficeImages={setOfficeImages}
              setError={setError}
            />

            {/* Upload progress indicator */}
            {uploadProgress && (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: '#F5F3FF',
                borderWidth: 1,
                borderColor: '#DDD6FE',
                borderRadius: 12,
                padding: 14,
              }}>
                <ActivityIndicator size="small" color="#7C3AED" />
                <Text style={{ flex: 1, fontSize: 13, color: '#7C3AED' }}>
                  Uploading {uploadProgress.fileName} ({uploadProgress.current}/{uploadProgress.total})…
                </Text>
              </View>
            )}

            {/* CTA button — matches login "Continue" button */}
            <TouchableOpacity
              onPress={handleNext}
              activeOpacity={0.88}
              disabled={loading}
              style={{ opacity: loading ? 0.65 : 1 }}
            >
              <View style={{
                height: 56,
                borderRadius: 16,
                backgroundColor: '#7C3AED',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: -0.3 }}>
                      {isLastStep ? (isOAuthOnboarding ? 'Complete profile' : 'Create account') : 'Continue'}
                    </Text>
                    <MaterialCommunityIcons
                      name={isLastStep ? 'check' : 'arrow-right'}
                      size={18}
                      color="rgba(255,255,255,0.7)"
                    />
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Skip link for optional steps */}
            {['photo', 'social'].includes(stepKey) && !isLastStep && (
              <TouchableOpacity onPress={() => setCurrentStep((v) => v + 1)} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Skip for now</Text>
              </TouchableOpacity>
            )}

            {/* Sign-in link */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, marginTop: 24, marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#9CA3AF' }}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity hitSlop={{ top: 10, bottom: 10, left: 4, right: 10 }}>
                  <Text style={{ fontSize: 13, color: '#7C3AED', fontWeight: '700' }}>Sign in →</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}