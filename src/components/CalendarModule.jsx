import React, { useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Ultra-Minimalist Apple macOS Calendar Module
 * 
 * Clean, borderless, typography-first design fitted for Quick Pill (430px x 150px)
 * with 20px reserved bottom clearance to prevent collision with pagination dots.
 */
export default function CalendarModule() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewDate, setViewDate] = useState(() => new Date());

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const selectedDayNum = selectedDate.getDate();
  const selectedWeekday = selectedDate.toLocaleDateString([], { weekday: "short" }).toUpperCase();
  const selectedMonth = selectedDate.toLocaleDateString([], { month: "short" });
  const selectedYear = selectedDate.getFullYear();

  const isSelectedToday =
    selectedDate.getDate() === today.getDate() &&
    selectedDate.getMonth() === today.getMonth() &&
    selectedDate.getFullYear() === today.getFullYear();

  const handlePrevMonth = useCallback((e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }, []);

  const handleNextMonth = useCallback((e) => {
    e.stopPropagation();
    setViewDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  }, []);

  const handleGoToToday = useCallback((e) => {
    if (e) e.stopPropagation();
    const now = new Date();
    setSelectedDate(now);
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
  }, []);

  // 7-column calendar cells (35 or 42 cells)
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const cells = [];

    // Prev month trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      cells.push({
        day: d,
        isCurrentMonth: false,
        fullDate: new Date(viewYear, viewMonth - 1, d)
      });
    }

    // Current month days
    for (let d = 1; d <= daysInCurrentMonth; d++) {
      cells.push({
        day: d,
        isCurrentMonth: true,
        fullDate: new Date(viewYear, viewMonth, d)
      });
    }

    // Next month leading days
    const targetTotal = cells.length <= 35 ? 35 : 42;
    const remaining = targetTotal - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({
        day: d,
        isCurrentMonth: false,
        fullDate: new Date(viewYear, viewMonth + 1, d)
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const monthTitle = viewDate.toLocaleDateString([], { month: "long", year: "numeric" });
  const weekdaysShort = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0px 4px 14px 4px",
        boxSizing: "border-box",
        userSelect: "none"
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 12
        }}
      >
        {/* Left: Minimalist Hero Date (Pure Typography, No Box) */}
        <div
          style={{
            width: 96,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flexShrink: 0,
            paddingLeft: 4
          }}
        >
          <span
            style={{
              fontSize: 9.5,
              fontWeight: 800,
              color: "#ff3b30",
              letterSpacing: "0.8px",
              textTransform: "uppercase",
              marginBottom: 1
            }}
          >
            {selectedWeekday}
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "-1px",
              lineHeight: "34px",
              fontVariantNumeric: "tabular-nums"
            }}
          >
            {selectedDayNum}
          </span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 500,
              color: "rgba(255, 255, 255, 0.45)",
              marginTop: 1
            }}
          >
            {selectedMonth} {selectedYear}
          </span>

          {!isSelectedToday && (
            <button
              onClick={handleGoToToday}
              style={{
                marginTop: 3,
                background: "transparent",
                border: "none",
                color: "#ff453a",
                fontSize: 9,
                fontWeight: 700,
                padding: 0,
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 3
              }}
            >
              <span>↩</span>
              <span>Today</span>
            </button>
          )}
        </div>

        {/* Delicate Hairline Separator */}
        <div
          style={{
            width: 1,
            height: "75%",
            background: "rgba(255, 255, 255, 0.08)",
            flexShrink: 0
          }}
        />

        {/* Right: Clean macOS Month Grid */}
        <div
          style={{
            flex: 1,
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minWidth: 0,
            paddingRight: 4
          }}
        >
          {/* Month Header with ghost arrows */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: 16,
              marginBottom: 1
            }}
          >
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 700,
                color: "#ffffff",
                letterSpacing: "-0.2px"
              }}
            >
              {monthTitle}
            </span>

            <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <button
                onClick={handlePrevMonth}
                title="Previous Month"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  padding: "1px 2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "color 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                }}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={handleNextMonth}
                title="Next Month"
                style={{
                  background: "transparent",
                  border: "none",
                  color: "rgba(255, 255, 255, 0.5)",
                  padding: "1px 2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "color 0.15s ease"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#ffffff";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.5)";
                }}
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>

          {/* Weekday Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              height: 10,
              lineHeight: "10px",
              marginBottom: 1
            }}
          >
            {weekdaysShort.map((w, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  color: "rgba(255, 255, 255, 0.35)"
                }}
              >
                {w}
              </span>
            ))}
          </div>

          {/* 7-Col Days Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              rowGap: 1.5,
              columnGap: 1.5,
              flex: 1,
              alignContent: "space-between"
            }}
          >
            {calendarCells.map((cell, idx) => {
              const cellDate = cell.fullDate;
              const isCellToday =
                cellDate.getDate() === today.getDate() &&
                cellDate.getMonth() === today.getMonth() &&
                cellDate.getFullYear() === today.getFullYear();
              const isCellSelected =
                cellDate.getDate() === selectedDate.getDate() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getFullYear() === selectedDate.getFullYear();

              return (
                <div
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedDate(cellDate);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100%",
                    minHeight: 13,
                    cursor: "pointer"
                  }}
                >
                  <div
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8.5,
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: isCellToday ? 800 : isCellSelected ? 700 : 500,
                      background: isCellToday
                        ? "#ff3b30"
                        : isCellSelected
                          ? "rgba(255, 255, 255, 0.2)"
                          : "transparent",
                      color: isCellToday
                        ? "#ffffff"
                        : isCellSelected
                          ? "#ffffff"
                          : cell.isCurrentMonth
                            ? "rgba(255, 255, 255, 0.85)"
                            : "rgba(255, 255, 255, 0.18)",
                      boxShadow: isCellToday
                        ? "0 0 5px rgba(255, 59, 48, 0.45)"
                        : "none",
                      transition: "all 0.12s ease"
                    }}
                    onMouseEnter={(e) => {
                      if (!isCellToday && !isCellSelected) {
                        e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isCellToday && !isCellSelected) {
                        e.currentTarget.style.background = "transparent";
                      }
                    }}
                  >
                    {cell.day}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
