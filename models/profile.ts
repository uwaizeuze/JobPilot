import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface IEmploymentHistory {
  company: string;
  title: string;
  location?: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  responsibilities: string[];
  achievements: string[];
}

export interface ITechnicalSkill {
  name: string;
  category?: string;
  yearsOfExperience?: number;
  proficiency: "beginner" | "intermediate" | "advanced" | "expert";
}

export interface IEducation {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startYear?: number;
  endYear?: number;
  gpa?: string;
}

export interface ICertification {
  name: string;
  issuer: string;
  issueDate?: string;
  expiryDate?: string;
  credentialUrl?: string;
}

export interface IProject {
  title: string;
  description: string;
  technologies: string[];
  url?: string;
  repoUrl?: string;
}

export interface ICompensation {
  expectedSalary?: number;
  currentSalary?: number;
  currency: string;
}

export interface IProfileUrls {
  portfolio?: string;
  github?: string;
  linkedin?: string;
  other?: string;
}

export interface IProfessionalProfile extends Document {
  userId: Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
  currentLocation: string;
  preferredLocations: string[];
  remotePreference: "remote" | "hybrid" | "onsite" | "flexible";
  headline: string;
  summary: string;
  totalExperienceYears: number;
  currentEmployer?: string;
  employmentHistory: IEmploymentHistory[];
  technicalSkills: ITechnicalSkill[];
  education: IEducation[];
  certifications: ICertification[];
  projects: IProject[];
  urls: IProfileUrls;
  compensation: ICompensation;
  noticePeriodDays?: number;
  availabilityDate?: string;
  workAuthorization: string[];
  preferredIndustries: string[];
  employmentTypes: string[];
  preferredSeniority: string[];
  completenessScore: number;
  createdAt: Date;
  updatedAt: Date;
}

const EmploymentHistorySchema = new Schema<IEmploymentHistory>(
  {
    company: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    location: { type: String, trim: true },
    startDate: { type: String, required: true },
    endDate: { type: String },
    current: { type: Boolean, default: false },
    responsibilities: [{ type: String, trim: true }],
    achievements: [{ type: String, trim: true }],
  },
  { _id: true }
);

const TechnicalSkillSchema = new Schema<ITechnicalSkill>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    yearsOfExperience: { type: Number, min: 0 },
    proficiency: {
      type: String,
      enum: ["beginner", "intermediate", "advanced", "expert"],
      default: "intermediate",
    },
  },
  { _id: true }
);

const EducationSchema = new Schema<IEducation>(
  {
    institution: { type: String, required: true, trim: true },
    degree: { type: String, required: true, trim: true },
    fieldOfStudy: { type: String, trim: true },
    startYear: { type: Number },
    endYear: { type: Number },
    gpa: { type: String, trim: true },
  },
  { _id: true }
);

const CertificationSchema = new Schema<ICertification>(
  {
    name: { type: String, required: true, trim: true },
    issuer: { type: String, required: true, trim: true },
    issueDate: { type: String },
    expiryDate: { type: String },
    credentialUrl: { type: String, trim: true },
  },
  { _id: true }
);

const ProjectSchema = new Schema<IProject>(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    technologies: [{ type: String, trim: true }],
    url: { type: String, trim: true },
    repoUrl: { type: String, trim: true },
  },
  { _id: true }
);

const ProfessionalProfileSchema = new Schema<IProfessionalProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },
    phone: { type: String, default: "", trim: true },
    currentLocation: { type: String, default: "", trim: true },
    preferredLocations: [{ type: String, trim: true }],
    remotePreference: {
      type: String,
      enum: ["remote", "hybrid", "onsite", "flexible"],
      default: "remote",
    },
    headline: { type: String, default: "", trim: true },
    summary: { type: String, default: "", trim: true },
    totalExperienceYears: { type: Number, default: 0, min: 0 },
    currentEmployer: { type: String, default: "", trim: true },
    employmentHistory: [EmploymentHistorySchema],
    technicalSkills: [TechnicalSkillSchema],
    education: [EducationSchema],
    certifications: [CertificationSchema],
    projects: [ProjectSchema],
    urls: {
      portfolio: { type: String, default: "", trim: true },
      github: { type: String, default: "", trim: true },
      linkedin: { type: String, default: "", trim: true },
      other: { type: String, default: "", trim: true },
    },
    compensation: {
      expectedSalary: { type: Number },
      currentSalary: { type: Number },
      currency: { type: String, default: "USD" },
    },
    noticePeriodDays: { type: Number, default: 0 },
    availabilityDate: { type: String, default: "" },
    workAuthorization: [{ type: String, trim: true }],
    preferredIndustries: [{ type: String, trim: true }],
    employmentTypes: [{ type: String, trim: true }],
    preferredSeniority: [{ type: String, trim: true }],
    completenessScore: { type: Number, default: 0, min: 0, max: 100 },
  },
  {
    timestamps: true,
  }
);

export const ProfessionalProfile: Model<IProfessionalProfile> =
  mongoose.models.ProfessionalProfile ||
  mongoose.model<IProfessionalProfile>(
    "ProfessionalProfile",
    ProfessionalProfileSchema
  );
