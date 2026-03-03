// Tip Calculator — Chia tiền tip theo giờ làm
// Công thức: SKILL.md mục 10 — Tip Pooling

export type AttendanceInput = {
  profile_id: string;
  full_name: string;
  checkin_at: string | null;
  checkout_at: string | null;
  // Fallback nếu chưa checkout
  shift_end_time: string | null;
};

export type TipDistribution = {
  profile_id: string;
  full_name: string;
  hours: number;
  ratio: number;
  amount: number;
};

export type TipCalcResult = {
  distributions: TipDistribution[];
  totalHours: number;
  totalAmount: number;
};

/**
 * Tính số giờ làm từ check-in đến check-out.
 * Nếu chưa checkout → dùng shift_end_time làm fallback.
 * Trả về giờ dạng float (ví dụ 5.5h).
 */
function calcHours(att: AttendanceInput): number {
  if (!att.checkin_at) return 0;

  const checkin = new Date(att.checkin_at).getTime();

  // Ưu tiên checkout thực tế, fallback về shift.end_time
  const endTime = att.checkout_at ?? att.shift_end_time;
  if (!endTime) return 0;

  const checkout = new Date(endTime).getTime();
  if (checkout <= checkin) return 0;

  // Giờ float, 2 chữ số thập phân
  return Math.round(((checkout - checkin) / (1000 * 60 * 60)) * 100) / 100;
}

/**
 * Chia tip theo giờ làm.
 *
 * @param attendances - Danh sách chấm công (CHỈ staff + azubi)
 * @param totalAmount - Tổng tiền tip
 * @returns TipCalcResult hoặc null nếu không chia được
 */
export function calculateTipDistribution(
  attendances: AttendanceInput[],
  totalAmount: number,
): TipCalcResult | null {
  // Tính giờ từng người
  const withHours = attendances.map((att) => ({
    ...att,
    hours: calcHours(att),
  }));

  // Lọc người có giờ > 0
  const valid = withHours.filter((a) => a.hours > 0);

  if (valid.length === 0) return null;

  // Tổng giờ
  const totalHours = valid.reduce((sum, a) => sum + a.hours, 0);

  if (totalHours === 0) return null;

  // Tính ratio + amount
  const distributions: TipDistribution[] = valid.map((a) => {
    const ratio = a.hours / totalHours;
    const amount = Math.round(totalAmount * ratio * 100) / 100;

    return {
      profile_id: a.profile_id,
      full_name: a.full_name,
      hours: a.hours,
      ratio: Math.round(ratio * 10000) / 10000, // 4 decimal
      amount,
    };
  });

  // Kiểm tra tổng sau làm tròn, bù lệch cho người nhiều giờ nhất
  const distributedTotal = distributions.reduce((s, d) => s + d.amount, 0);
  const diff = Math.round((totalAmount - distributedTotal) * 100) / 100;

  if (diff !== 0) {
    // Tìm người nhiều giờ nhất
    const maxIdx = distributions.reduce(
      (maxI, d, i) => (d.hours > distributions[maxI].hours ? i : maxI),
      0,
    );
    distributions[maxIdx].amount =
      Math.round((distributions[maxIdx].amount + diff) * 100) / 100;
  }

  return {
    distributions,
    totalHours: Math.round(totalHours * 100) / 100,
    totalAmount,
  };
}
