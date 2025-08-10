export class KrsRequirementsResponse {
  judul: string;
  data_syarat: {
    syarat: string;
    isi: string;
    status: boolean;
  }[];
  pengisisan_krs_enabled: boolean;
}
