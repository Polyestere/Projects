let popupCount = 0; // 팝업의 개수를 추적하는 변수
let positionCount = 0; // 팝업의 Y축 위치를 누적, 계산하기 위한 변수
let leftPosition = 20;// 초기 좌측 여백을 20px로 설정

window.onload = function() { 
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1); // 하루 전 날짜 설정

    // 날짜를 'YYYY-MM-DD' 형식으로 변환
    const formattedDate = yesterday.toISOString().slice(0, 10);
    document.getElementById('search-date').value = formattedDate;
    document.getElementById('character-name').value = ''; // 캐릭터 이름 초기화

    // Enter 키를 눌렀을 때도 검색 기능을 실행하도록 이벤트 리스너 추가
    document.getElementById('character-name').addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            searchCharacter(); // 엔터키를 눌렀을 때 searchCharacter 호출
        }
    });
};

function searchCharacter() {
    const characterName = document.getElementById('character-name').value; // 사용자가 입력한 캐릭터 이름 가져오기
    const searchDate = document.getElementById('search-date').value;

    if (!characterName) {
        alert("캐릭터 닉네임을 입력하세요."); // 입력 검증
        return;
    }

    const headers = {
        "x-nxopen-api-key": "" // 발급받은 nxopen_api_key 입력
    }; // 발급받은 nxopen_api_key 입력

    // 첫 번째 요청: 캐릭터 ocid 가져오기
    fetch(`https://open.api.nexon.com/maplestory/v1/id?character_name=${characterName}`, {
        method: "GET",
        headers: headers
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('캐릭터 ID를 불러오는 중 오류가 발생했습니다.');
        }
        return response.json();
    })
    .then(data => {
        const ocid = data.ocid;

        // 두 번째 요청: 캐릭터 기본 정보, 전투력, 인기도, 유니온 정보 가져오기
        return Promise.all([
            fetch(`https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('캐릭터 기본 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/stat?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('캐릭터 전투력을 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/character/popularity?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('인기도 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            }),
            fetch(`https://open.api.nexon.com/maplestory/v1/user/union?ocid=${ocid}&date=${searchDate}`, {
                method: "GET",
                headers: headers
            }).then(res => {
                if (!res.ok) {
                    throw new Error('유니온 정보를 불러오는 중 오류가 발생했습니다.');
                }
                return res.json();
            })
        ]);
    })
    .then(([basicData, combatData, popularityData, unionData]) => {
        // 전투력 포맷 수정 (억 단위로 구분)
        const combatPower = combatData.final_stat.find(stat => stat.stat_name === "전투력")?.stat_value || '정보 없음';
        const formattedCombatPower = formatCombatPower(combatPower);

        // 경험치 비율에 % 추가
        const expRate = basicData.character_exp_rate ? `${basicData.character_exp_rate}%` : '정보 없음';

        // 새로운 팝업 생성
        popupCount++; // 팝업 번호 증가
        const newPopup = document.createElement('div');
        newPopup.id = `character-info-${popupCount}`;
        newPopup.classList.add('character-info-popup');
        
        // 기본 정보 HTML에 반영
        newPopup.innerHTML = `
            <close-button onclick="closeCharacterInfo(${popupCount})">X</close-button>

            <div class="character-content">
                <div class="character-detail">
                    <p>월드: <span id="world_name">${basicData.world_name || '정보 없음'}</span></p>
                    <p>직업: <span id="character_class">${basicData.character_class || '정보 없음'}</span></p>
                    <p>이름: <span id="character_name">${basicData.character_name || '정보 없음'}</span></p>
                    <p>레벨: <span id="character_level">${basicData.character_level || '정보 없음'}</span></p>
                    <p>경험치: <span id="character_exp_rate">${expRate}</span></p>
                    <p>길드: <span id="character_guild_name">${basicData.character_guild_name || '정보 없음'}</span></p>
                    <p>인기도: <span id="popularity">${popularityData.popularity || '정보 없음'}</span></p>
                    <p>전투력: <span id="combat_power">${formattedCombatPower}</span></p>
                    <p>유니온: <span id="union_level">${unionData.union_level || '정보 없음'}</span></p>
                </div>
                <div class="image-container">
                    <img src="${basicData.character_image || ''}" alt="캐릭터 이미지" id="character_image">
                </div>
            </div>
        `;
        
        // 새 팝업을 body에 추가
        document.body.appendChild(newPopup);

        // 팝업 위치 조정
        adjustPopupPosition(newPopup);

        // 팝업 드래그 기능 추가
        enableDrag(newPopup);
        enableResize(newPopup);
        adjustPopupSize(newPopup);
    })
    .catch(error => {
        alert(error.message); // 사용자에게 오류 메시지 표시
        console.error('Error:', error);
    });
}

function enableResize(popupElement) {
    const resizeHandle = document.createElement('div');
    resizeHandle.style.width = '30px';
    resizeHandle.style.height = '20px';
    resizeHandle.style.background = 'gray';
    resizeHandle.style.position = 'absolute';
    resizeHandle.style.bottom = '0';
    resizeHandle.style.right = '0';
    resizeHandle.style.cursor = 'nwse-resize'; // 대각선 커서 설정
    popupElement.appendChild(resizeHandle);

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    // 최대 및 최소 크기 설정
    const MIN_SIZE = 20; // 최소 크기 (가로와 세로 동일)
    const MAX_SIZE = 800; // 최대 크기 (가로와 세로 동일)

    resizeHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = parseInt(document.defaultView.getComputedStyle(popupElement).width, 10);
        startHeight = parseInt(document.defaultView.getComputedStyle(popupElement).height, 10);

        e.preventDefault(); // 기본 이벤트 방지
        e.stopPropagation(); // 다른 이벤트와 충돌 방지
    });

    document.addEventListener('mousemove', (e) => {
        if (isResizing) {
            // 대각선 크기 조절: X축과 Y축의 움직임 중 더 큰 값을 기준으로 계산
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;

            // 마우스 이동에 민감도를 더해줌
            const delta = Math.max(deltaX, deltaY);

            let newSize = startWidth + delta; // 새 크기 계산 (가로와 세로 동일하게)  
            newSize = Math.min(Math.max(newSize, MIN_SIZE+190), MAX_SIZE-210); // 크기 제한 적용
            let newHeight = (newSize / startWidth) * startHeight; // 비율 유지
            // 팝업 크기 조정
            popupElement.style.width = `${newSize}px`;
            popupElement.style.height = `${newHeight}px`;
            
            // 팝업 콘텐츠 크기 조정
            adjustPopupContent(popupElement, newSize, newSize);

            // 애니메이션 최적화를 위해 requestAnimationFrame 사용
            window.requestAnimationFrame(() => {
                popupElement.style.width = `${newSize}px`;
                popupElement.style.height = `${newHeight}px`;
                adjustPopupContent(popupElement, newSize, newSize); // 내용물 비율 유지
            });
        }
    });

    document.addEventListener('mouseup', () => {
        isResizing = false;
    });
}


function adjustPopupContent(popupElement, newWidth, newHeight) {
    const imageContainer = popupElement.querySelector('.image-container');
    const characterDetail = popupElement.querySelector('.character-detail');
    const characterImage = popupElement.querySelector('#character_image');

    // 팝업의 기본 크기
    const baseWidth = 600; // 팝업의 초기 너비
    const baseHeight = 400; // 팝업의 초기 높이

    // 이미지와 텍스트의 초기 크기
    const baseImageWidth = baseWidth * 0.4; // 이미지가 팝업의 40% 차지
    const baseFontSize = 16; // 기본 텍스트 폰트 크기

    // 비율에 따라 이미지와 텍스트 크기 조정
    const scaleFactorWidth = Math.pow(newWidth / baseWidth, 1.3); // 크기가 줄어들수록 더 빨리 줄어듦
    const scaleFactorHeight = Math.pow(newHeight / baseHeight, 1.3); // 크기가 줄어들수록 더 빨리 줄어듦

    // 이미지 크기 조정
    if (imageContainer && characterImage) {
        const newImageWidth = baseImageWidth * scaleFactorWidth;
        imageContainer.style.width = `${newImageWidth*1.4}px`;
        imageContainer.style.height = `${newImageWidth*1.4}px`; // 이미지 비율 유지 (가로:세로 = 2:3)
        characterImage.style.width = '100%';
        characterImage.style.height = '100%';
    }

    // 텍스트 크기 조정
    if (characterDetail) {
        const newFontSize = baseFontSize * scaleFactorWidth; // 폰트 크기 비율 적용
        characterDetail.style.fontSize = `${newFontSize}px`;
        characterDetail.style.lineHeight = `${newFontSize * 1.2}px`; // 가독성을 위한 줄 간격 유지
      
    }
}


function closeCharacterInfo(popupId) {
    const popup = document.getElementById(`character-info-${popupId}`);
    if (popup) {
        popup.remove(); // 팝업 제거
    }
}

// 전투력 포맷팅 함수 (0억 0000만 0000 형태로 구분)
// 팝업창 크기 조절에 따른 이미지와 정보의 크기 비율을 동적으로 조정
function adjustPopupSize() {
    const popup = document.getElementById("character-info");
    const imageContainer = document.querySelector(".image-container");
    const characterDetail = document.querySelector(".character-detail");
    const characterImage = document.getElementById("character_image");

    // 팝업의 너비와 높이를 가져옴
    const popupWidth = popup.offsetWidth;
    const popupHeight = popup.offsetHeight;

    // 비율을 계산하여 이미지와 캐릭터 정보 크기 조정
    const imageWidth = popupWidth * 0.4; // 이미지 크기를 팝업 너비의 40%로 설정
    const detailWidth = popupWidth * 0.55; // 정보 영역을 팝업 너비의 55%로 설정

    // 이미지 크기 변경
    imageContainer.style.width = `${imageWidth}px`;
    characterImage.style.width = "100%"; // 이미지 크기를 100%로 맞추기

    // 정보 크기 변경
    characterDetail.style.flex = `${detailWidth / popupWidth}`;
}

// 팝업창의 크기가 변경될 때마다 조정
window.addEventListener("resize", adjustPopupSize);

// 페이지 로드 시 처음 크기 조정
window.addEventListener("load", adjustPopupSize);

function formatCombatPower(combatPower) {
    if (combatPower === '정보 없음') return combatPower;  // "정보 없음"일 경우 그대로 반환

    let value = parseInt(combatPower, 10);  // 문자열을 숫자형으로 변환

    if (isNaN(value)) return combatPower;  // 숫자가 아닌 값 처리

    const billions = Math.floor(value / 100000000); // 억 단위
    const millions = Math.floor((value % 100000000) / 10000); // 만 단위
    const thousands = value % 10000; // 천 단위 이하 값

    let result = '';

    if (billions > 0) {
        result += `${billions}억`;  // 억 단위 출력
    }
    if (millions > 0) {
        result += ` ${millions}만`;  // 만 단위 출력
    }
    if (thousands > 0 || result === '') {  // 천 단위 이하 출력 (0일 때 억, 만이 없으면 표시)
        result += ` ${thousands}`;  
    }

    return result.trim();  // 불필요한 공백 제거
}




function adjustPopupPosition(popupElement) {
    const footer = document.querySelector('footer');
    const footerRect = footer.getBoundingClientRect();
    
    let topPosition = 20 + 80 * positionCount; // Y축은 positionCount에 따라 증가
    let currentLeftPosition = leftPosition + 80 * positionCount; // X축도 positionCount에 따라 증가

    
    if (topPosition + popupElement.offsetHeight > footerRect.top + 400) {
      positionCount = 0; // positionCount 초기화
      leftPosition += 420; // x축 이동
      topPosition = 20; // y축 초기화
      currentLeftPosition = leftPosition;
    }

    popupElement.style.position = 'fixed';
    popupElement.style.top = `${topPosition}px`;
    popupElement.style.left = `${currentLeftPosition}px`; // 좌측 20px 여백
  
    positionCount ++;

}

let highestZIndex = 100; // 현재 가장 높은 z-index 값을 추적

function enableDrag(popupElement) {
    let isDragging = false;
    let offsetX, offsetY;

    popupElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popupElement.offsetLeft;
        offsetY = e.clientY - popupElement.offsetTop;

        // z-index를 높여 클릭한 팝업을 앞으로
        highestZIndex++;
        popupElement.style.zIndex = highestZIndex;

        popupElement.style.cursor = 'move';
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            // 새 위치 계산
            let newX = e.clientX - offsetX;
            let newY = e.clientY - offsetY;

            // 경계 설정 (뷰포트 내로 제한)
            const maxWidth = window.innerWidth - popupElement.offsetWidth;
            const maxHeight = window.innerHeight - popupElement.offsetHeight;

            if (newX < 0) newX = 0; // 왼쪽 경계
            if (newY < 0) newY = 0; // 상단 경계
            if (newX > maxWidth) newX = maxWidth; // 오른쪽 경계
            if (newY > maxHeight) newY = maxHeight; // 하단 경계

            popupElement.style.left = `${newX}px`;
            popupElement.style.top = `${newY}px`;
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        popupElement.style.cursor = 'default';
    });
}