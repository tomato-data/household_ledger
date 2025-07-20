import React, { useState } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

function CalendarBox( { value, onChange } ) {

    return (
        <div>
            <h3>날짜 선택</h3>
            <Calendar onChange={onChange} value={value} />
            <p>선택한 날짜: {value.toLocaleDateString()}</p>
        </div>
    )
}

export default CalendarBox;