
import React, { useMemo } from 'react';
import { ScheduleResult, Teacher, Class, Subject, BellSchedule, GlobalParams, TeacherType, Language } from '../types';
import { translations } from '../i18n';

interface ScheduleViewProps {
  language: Language;
  type: 'class' | 'teacher' | 'sanity';
  result: ScheduleResult;
  teachers: Teacher[];
  classes: Class[];
  subjects: Subject[];
  bell: BellSchedule;
  params: GlobalParams;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({ language, type, result, teachers, classes, subjects, bell, params }) => {
  const t = translations[language];
  const totalPeriods = bell.morningPeriods + bell.afternoonPeriods;
  const days = Array.from({ length: bell.daysPerWeek }, (_, i) => i + 1);
  const periods = Array.from({ length: totalPeriods }, (_, i) => i + 1);
  const subjectMap = useMemo(() => {
    const map: Record<string, Subject> = {};
    subjects.forEach(s => { map[s.id] = s; });
    return map;
  }, [subjects]);

  type Slot =
    | { type: 'period'; period: number }
    | { type: 'break'; label: string }
    | { type: 'lunch'; label: string };

  const slots: Slot[] = [];

  for (let p = 1; p <= totalPeriods; p++) {
    slots.push({ type: 'period', period: p });

    if (p === bell.morningBreakAfter) {
      slots.push({ type: 'break', label: t.break });
    }

    if (p === bell.morningPeriods) {
      slots.push({ type: 'lunch', label: t.lunch });
    }

    if (p === bell.morningPeriods + bell.afternoonBreakAfter) {
      slots.push({ type: 'break', label: t.break });
    }
  }

  const getDayName = (day: number) => {
    const names = [t.monday, t.tuesday, t.wednesday, t.thursday, t.friday, t.saturday, t.sunday];
    return names[day - 1] || `${language === 'vi' ? 'Ngày' : 'Day'} ${day}`;
  };

  const isFlagSlot = (day: number, period: number) =>
  bell.hasFlagSalute && day === 1 && period === 1;

  if (type === 'class') {
    return (
      <div className="space-y-12">
        {classes.map(cls => (
          <div key={cls.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-900">{cls.name} <span className="text-slate-400 font-normal ml-2"></span></h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">{t.period}</th>
                    {days.map(d => <th key={d} className="p-4 border-r border-slate-100 text-sm font-bold text-slate-600">{getDayName(d)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {slots.map((slot, index) => (
                    <tr key={`slot-${index}`} className="group">
                      <td className="p-2 border-t border-r border-slate-100 bg-slate-50/20 text-center">
                        {slot.type === 'period' && (
                          <span className="text-xs font-bold text-slate-400">P{slot.period}</span>
                        )}

                        {slot.type === 'break' && (
                          <span className="text-xs font-bold text-indigo-500 uppercase">
                            {slot.label}
                          </span>
                        )}

                        {slot.type === 'lunch' && (
                          <span className="text-xs font-bold text-indigo-600 uppercase">
                            {slot.label}
                          </span>
                        )}
                      </td>
                      {days.map(d => {
                        if (slot.type !== 'period') {
                          return (
                            <td
                              key={d}
                              className="py-1 px-2 border-t border-r border-slate-100 bg-indigo-50"
                            >
                            </td>
                          );
                        }

                        const p = slot.period;

                        if (slot.type === 'period' && isFlagSlot(d, slot.period)) {
                          return (
                            <td
                              key={d}
                              className="p-3 border-t border-r border-slate-100 bg-amber-100 text-amber-800 font-bold text-xs"
                            >
                              {t.flagSalute}
                            </td>
                          );
                        }

                        const assignment = result.assignments.find(
                          a => a.classId === cls.id && a.day === d && a.period === slot.period
                        );
                        const sub = subjects.find(s => s.id === assignment?.subjectId);
                        const teacher = teachers.find(teach => teach.id === assignment?.teacherId);

                        return (
                          <td
                            key={d}
                            className={`p-3 border-t border-r border-slate-100 min-h-[80px] transition-colors group-hover:bg-slate-50/30 ${
                              assignment ? 'bg-white' : 'bg-slate-50/10'
                            }`}
                          >
                            {assignment ? (
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`text-sm font-bold leading-tight ${
                                      sub?.type === 'Main' ? 'text-indigo-900' : 'text-slate-700'
                                    }`}
                                  >
                                    {sub?.name}
                                  </div>

                                  <div
                                    className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      sub?.type === 'Main'
                                        ? 'bg-indigo-50 text-indigo-600'
                                        : sub?.type === 'Optional'
                                        ? 'bg-emerald-50 text-emerald-600'
                                        : 'bg-slate-100 text-slate-500'
                                    }`}
                                  >
                                    {sub?.type === 'Main'
                                      ? language === 'vi'
                                        ? 'Chính'
                                        : 'Main'
                                      : sub?.type === 'Optional'
                                      ? language === 'vi'
                                        ? 'Tự chọn'
                                        : 'Optional'
                                      : language === 'vi'
                                      ? 'Phụ'
                                      : 'Extra'}
                                  </div>
                                </div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <i className="fas fa-user-tie text-[8px]"></i> {teacher?.name}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-200 text-center py-2">
                                <i className="fas fa-minus text-xs"></i>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'teacher') {
    return (
      <div className="space-y-12">
        {teachers.map(teach => (
          <div key={teach.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{teach.name}</h3>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-widest">
                   {teach.type === TeacherType.HOMEROOM ? (language === 'vi' ? 'Chủ nhiệm' : 'Homeroom') : teach.type === TeacherType.OUTSOURCED ? (language === 'vi' ? 'Thuê ngoài' : 'Outsourced') : (language === 'vi' ? 'Tiêu chuẩn' : 'Standard')}
                </p>
              </div>
              <div className="flex gap-6">
                {(() => {
                  const teacherAssignments = result.assignments.filter(
                    a => a.teacherId === teach.id
                  );

                  const compulsoryCount = teacherAssignments.filter(a => {
                    const sub = subjectMap[a.subjectId];
                    return sub?.type !== 'Optional';
                  }).length;

                  const optionalCount = teacherAssignments.length - compulsoryCount;

                  return (
                    <>
                      {/* Compulsory */}
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase">
                          {language === 'vi' ? 'Nghĩa vụ' : 'Responsibility'}
                        </div>
                        <div className="text-sm font-bold text-indigo-600">
                          {compulsoryCount}
                        </div>
                      </div>

                      {/* Optional */}
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase">
                          {language === 'vi' ? 'Tự chọn' : 'Optional'}
                        </div>
                        <div className="text-sm font-bold text-emerald-600">
                          {optionalCount}
                        </div>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <div className="text-xs text-slate-400 font-bold uppercase">
                          {t.totalLoad}
                        </div>
                        <div className="text-sm font-bold text-slate-800">
                          {teacherAssignments.length}
                        </div>
                      </div>
                    </>
                  );
                })()}

              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="p-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24">{t.period}</th>
                    {days.map(d => <th key={d} className="p-4 border-r border-slate-100 text-sm font-bold text-slate-600">{getDayName(d)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {periods.map(p => (
                    <tr key={p} className="group">
                      <td className="p-4 border-t border-r border-slate-100 bg-slate-50/20 text-center">
                        <span className="text-xs font-bold text-slate-400">P{p}</span>
                      </td>
                      {days.map(d => {
                        if (isFlagSlot(d, p)) {
                          return (
                            <td
                              key={d}
                              className="p-3 border-t border-r border-slate-100 bg-amber-100 text-amber-800 font-bold text-xs"
                            >
                              {t.flagSalute}
                            </td>
                          );
                        }

                        const assignment = result.assignments.find(
                          a => a.teacherId === teach.id && a.day === d && a.period === p
                        );
                        const cls = classes.find(c => c.id === assignment?.classId);
                        const sub = subjects.find(s => s.id === assignment?.subjectId);

                        return (
                          <td
                            key={d}
                            className={`py-1 px-2 border-t border-r border-slate-100 min-h-[80px] transition-colors group-hover:bg-slate-50/30 ${
                              assignment ? 'bg-white' : 'bg-slate-50/10'
                            }`}
                          >
                            {assignment ? (
                              <div className="space-y-1">
                                <div className="text-sm font-bold leading-tight text-slate-900">
                                  {cls?.name}
                                </div>
                                <div className="text-[10px] text-indigo-600 flex items-center gap-1 font-medium">
                                  <i className="fas fa-book-open text-[8px]"></i> {sub?.name}
                                </div>
                              </div>
                            ) : (
                              <div className="text-slate-200 text-center py-4">
                                <i className="fas fa-minus text-xs"></i>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'sanity') {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{language === 'vi' ? 'Tuân Thủ Giảng Viên & Kiểm Tra Tổng Thể' : 'Global Faculty Compliance & Sanity Check'}</h3>
        </div>
        <div className="overflow-auto max-h-[75vh]">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-4 border-r border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky top-0 left-0 bg-slate-50 z-30">{language === 'vi' ? 'Giáo viên' : 'Teacher'}</th>
                {days.map(d => periods.map(p => (
                   <th key={`${d}-${p}`} className="p-2 border-r border-slate-100 text-[9px] font-bold text-slate-500 whitespace-nowrap sticky top-0 bg-slate-50 z-20">
                      {language === 'vi'
                        ? `${getDayName(d).substr(4)} T${p}`
                        : `${getDayName(d).substr(0, 3)} P${p}`
                      }
                   </th>
                )))}
                <th className="p-4 border-l border-indigo-100 bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-widest sticky top-0 z-20">{t.totalLoad}</th>
                <th className="p-4 bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-widest sticky top-0 z-20">{t.extra}</th>
                <th className="p-4 bg-indigo-50 text-[10px] font-bold text-indigo-600 uppercase tracking-widest sticky top-0 z-20">{t.estCost}</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map(teach => {
                const teacherAssignments = result.assignments.filter(a => a.teacherId === teach.id);
                const compulsoryAssignments = teacherAssignments.filter(a => {
                  const sub = subjectMap[a.subjectId];
                  return sub?.type !== 'Optional';
                });

                const optionalAssignments = teacherAssignments.filter(a => {
                  const sub = subjectMap[a.subjectId];
                  return sub?.type === 'Optional';
                });

                const compulsoryLoad = compulsoryAssignments.length;
                const optionalLoad = optionalAssignments.length;

                const shortage = Math.max(0, teach.minPeriodsPerWeek - compulsoryLoad);
                const overMax = teacherAssignments.length > teach.maxPeriodsPerWeek;

                // Overtime only applies to compulsory
                const overtime = Math.max(0, compulsoryLoad - teach.minPeriodsPerWeek);

                // Base pay for compulsory
                const basePay = Math.min(compulsoryLoad, teach.minPeriodsPerWeek) * teach.payRate;

                // Overtime pay
                const overtimePay = overtime * teach.payRate * params.extraPayMultiplier;

                // Optional pay (subject rate)
                const optionalPay = optionalAssignments.reduce((sum, a) => {
                  const sub = subjectMap[a.subjectId];
                  return sum + (sub?.optionalPayRate || 0);
                }, 0);

                const extraVal = overtime;

                const cost = basePay + overtimePay + optionalPay;

                const totalLoad = teacherAssignments.length;

                return (
                  <tr
                    key={teach.id}
                    className={`hover:bg-slate-50 group ${
                      overMax ? 'bg-red-50' : ''
                    }`}
                  >
                    <td className="p-3 border-t border-r border-slate-100 font-bold text-xs text-slate-700 sticky left-0 bg-white group-hover:bg-slate-50 z-10">{teach.name}</td>
                    {days.map(d => periods.map(p => {
                      const a = teacherAssignments.find(as => as.day === d && as.period === p);
                      const cl = classes.find(c => c.id === a?.classId);
                      return (
                        <td key={`${d}-${p}`} className={`p-1 border-t border-r border-slate-100 text-[8px] text-center ${a ? 'bg-indigo-50' : ''}`}>
                          {cl?.name || ''}
                        </td>
                      );
                    }))}
                    <td className="p-3 border-t border-l border-indigo-100 bg-indigo-50/10 font-bold text-xs text-indigo-600">
                      <div className="flex items-center justify-center gap-1">
                        {totalLoad}
                        {shortage > 0 && (
                          <span className="bg-red-100 text-red-600 text-[9px] font-bold px-1 rounded">
                            -{shortage}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 border-t bg-indigo-50/10 font-bold text-xs text-amber-600">{extraVal > 0 ? `+${extraVal}` : '0'}</td>
                    <td className="p-3 border-t bg-indigo-50/10 font-bold text-xs text-slate-900">${cost.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return null;
};

export default ScheduleView;
