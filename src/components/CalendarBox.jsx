import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function CalendarBox() {
    const [value, setValue] = useState(new Date());

    return (
        <div>
            <h3>날짜 선택</h3>
            <Calendar onChange={setValue} value={value} />
            <p>선택한 날짜: {value.toLocaleDateString()}</p>
        </div>
    )
}

export default CalendarBox;