import { Document, Types } from 'mongoose';

// =====================================================
// ENUMS & CONSTANTS
// =====================================================

export enum UserRole {
  ADMIN = 'admin',
  TEACHER = 'teacher',
  CUSTOMER = 'customer',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}

export enum PackageType {
  PRIVATE = 'private',
  DUO = 'duo',
  GROUP = 'group',
  BLOCKED = 'blocked', // For time blocking
}

export enum PackageStatus {
  ACTIVE = 'active',
  USED = 'used',
  EXPIRED = 'expired',
  FROZEN = 'frozen',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'noShow',
  CANCELLATION_REQUESTED = 'cancellationRequested',
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card',
}

export enum NotificationChannel {
  LINE = 'line',
  EMAIL = 'email',
}

export enum NotificationType {
  REMINDER_24H = 'REMINDER_24H',
  REMINDER_6H = 'REMINDER_6H',
  MISSED_SESSION = 'MISSED_SESSION',
  INACTIVE_30D = 'INACTIVE_30D',
  PROMO = 'PROMO',
  BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
  BOOKING_REJECTED = 'BOOKING_REJECTED',
  BOOKING_REMINDER = 'BOOKING_REMINDER',
  PACKAGE_EXPIRING = 'PACKAGE_EXPIRING',
  WELCOME = 'WELCOME',
}

export enum NotificationStatus {
  SCHEDULED = 'scheduled',
  SENT = 'sent',
  FAILED = 'failed',
}

export enum PromoCampaignStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  SENT = 'sent',
}

// =====================================================
// USER INTERFACES
// =====================================================

export interface IUser extends Document {
  _id: Types.ObjectId;
  role: UserRole;
  name: string;
  email: string;
  phone: string;
  passwordHash: string | null;
  lineUserId: string | null;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICustomer extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  dateOfBirth?: Date;
  height?: number; // in cm
  weight?: number; // in kg
  medicalNotes?: string;
  profilePhoto?: string;
  profession?: string;
  gender?: 'male' | 'female' | 'other';
  healthNotes?: string;
  preferredTeacherId?: Types.ObjectId;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  tags: string[];
  totalCancellations: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ITeacher extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  bio?: string;
  specialties: string[];
  yearsOfExperience?: number;
  hourlyRate?: number;
  defaultLocation?: string;
  workingHoursTemplate?: Record<string, any>;
  isActive: boolean;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// PACKAGE & BOOKING INTERFACES
// =====================================================

export interface IPackage extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId | ICustomer;
  name: string;
  type: PackageType;
  totalSessions: number;
  remainingSessions: number;
  validFrom: Date;
  validTo: Date;
  price: number;
  currency: string;
  status: PackageStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBooking extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId | ICustomer;
  teacherId: Types.ObjectId | ITeacher;
  packageId?: Types.ObjectId | IPackage;
  type: PackageType;
  startTime: Date;
  endTime: Date;
  location?: string;
  status: BookingStatus;
  isRequestedByCustomer: boolean;
  requestCreatedAt?: Date;
  confirmedAt?: Date;
  confirmedBy?: Types.ObjectId | IUser;
  autoConfirmed?: boolean;
  googleCalendarEventId?: string;
  createdBy: Types.ObjectId | IUser;
  notes?: string;
  attendanceMarkedAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// PAYMENT INTERFACE
// =====================================================

export interface IPayment extends Document {
  _id: Types.ObjectId;
  customerId: Types.ObjectId | ICustomer;
  packageId: Types.ObjectId | IPackage;
  amount: number;
  currency: string;
  method: PaymentMethod;
  paidAt: Date;
  referenceCode?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// NOTIFICATION INTERFACES
// =====================================================

export interface INotification extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  channel: NotificationChannel;
  type: NotificationType;
  bookingId?: Types.ObjectId | IBooking;
  payload: Record<string, any>;
  scheduledFor: Date;
  status: NotificationStatus;
  sentAt?: Date;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMessageTemplate extends Document {
  _id: Types.ObjectId;
  key: string;
  channel: NotificationChannel;
  body: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IPromoCampaign extends Document {
  _id: Types.ObjectId;
  name: string;
  templateId: Types.ObjectId | IMessageTemplate;
  segmentFilter: Record<string, any>;
  scheduledFor: Date;
  status: PromoCampaignStatus;
  stats: {
    sent: number;
    failed: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// CALENDAR CONNECTION
// =====================================================

export interface ICalendarConnection extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId | IUser;
  googleAccountId: string;
  calendarId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// =====================================================
// REQUEST/RESPONSE TYPES
// =====================================================

export interface AuthTokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface CreatePackageRequest {
  customerId: string;
  name: string;
  type: PackageType;
  totalSessions: number;
  validFrom: string;
  validTo: string;
  price: number;
  currency: string;
  paymentMethod?: PaymentMethod;
  paymentReference?: string;
  note?: string;
}

export interface BookingRequestRequest {
  teacherId?: string;
  desiredTime: string;
  durationMinutes?: number;
  type: PackageType;
  packageId?: string;
  notes?: string;
}

export interface ConfirmBookingRequest {
  teacherId?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
}

export interface MarkAttendanceRequest {
  status: BookingStatus.COMPLETED | BookingStatus.NO_SHOW | BookingStatus.CANCELLED;
  notes?: string;
}

// =====================================================
// SESSION REVIEW
// =====================================================

export interface ISessionReview extends Document {
  _id: Types.ObjectId;
  bookingId: Types.ObjectId | IBooking;
  teacherId: Types.ObjectId | ITeacher;
  customerId: Types.ObjectId | ICustomer;
  ratings: {
    control: number;
    postureAlignment: number;
    strength: number;
    flexibilityMobility: number;
    bodyAwarenessFocus: number;
  };
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateReviewRequest {
  bookingId: string;
  ratings: {
    control: number;
    postureAlignment: number;
    strength: number;
    flexibilityMobility: number;
    bodyAwarenessFocus: number;
  };
  notes?: string;
}

// =====================================================
// EXPRESS REQUEST EXTENSIONS
// =====================================================

declare global {
  namespace Express {
    interface Request {
      user?: IUser;
    }
  }
}
