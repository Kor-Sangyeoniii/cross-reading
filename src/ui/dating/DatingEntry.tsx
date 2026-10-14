import { Tabs } from '../kit'
import { ChemistryCharacter } from '../ChemistryCharacters'
import { navigate } from '../router'
import styles from './DatingPilot.module.css'
export function DatingEntry() {
  return (
    <main className={`${styles.pilot} screen with-tabs`}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => navigate('/')}
        >
          cross<span>reading</span>
          <small>서로에게, 한 걸음</small>
        </button>
        <button
          type="button"
          className={styles.toolButton}
          onClick={() => navigate('/')}
        >
          기존 앱으로
        </button>
      </header>
      <section className={styles.hero}>
        <span className={styles.eyebrow}>A MORE INTENTIONAL CONNECTION</span>
        <h1>
          가깝게 살고,
          <br />
          시간이 맞고,
          <br />
          서로 궁금하다면.
        </h1>
        <p>
          기질 이야기로 시작해서
          <br />
          현실에서 만날 수 있는 소개로.
        </p>
        <div className={styles.heroArt}>
          <ChemistryCharacter kind="sprout" />
          <span>✦</span>
          <ChemistryCharacter kind="flame" />
        </div>
        <div className={styles.heroFooter}>
          <span>서로 선택하고</span>
          <span>각자 절반씩</span>
          <span>천천히 알아가요</span>
        </div>
      </section>
      <section className={styles.card}>
        <h2>처음이라면, 순서대로 따라와 보세요</h2>
        <p>
          내 소개부터 대화까지, 한 사람의 입장에서 따라가요. 상대의 행동은 가상
          예시로 이어져 계정을 바꿀 필요가 없어요.
        </p>
        <button
          type="button"
          className={styles.primary}
          onClick={() => navigate('/dating/demo')}
        >
          내 소개부터 시작하기
        </button>
        <p className={styles.tiny}>
          로그인 없이 이용해요. 실제 결제·본인인증·다른 사람에게 전송은 없어요.
          새로고침하면 체험이 초기화돼요.
        </p>
      </section>
      <section className={styles.card}>
        <h2>내 사주부터 소개까지 한눈에</h2>
        <p>오늘·내 사주·소개·대화·마이. 다섯 메뉴로 새 구성을 둘러보세요.</p>
        <button className={styles.primary} onClick={() => navigate('/try')}>
          새 앱 먼저 둘러보기
        </button>
      </section>
      <section className={styles.card}>
        <h2>우리의 소개 약속</h2>
        <ul className={styles.reasons}>
          <li>생활권·일정·관계 목적이 맞는 상대를 소개해요.</li>
          <li>두 사람이 관심을 확인한 뒤 연결비를 절반씩 내요.</li>
          <li>상대가 기한 안에 결제하지 않으면 전액 환불해요.</li>
          <li>대화가 열리면 메시지마다 추가 과금하지 않아요.</li>
        </ul>
        <p className={styles.tiny}>
          가격·기한은 체험용 가정이에요. 결제가 상대의 답장이나 만남을 보장하지
          않아요.
        </p>
      </section>
      <section className={styles.card}>
        <span className={styles.eyebrow}>실제 소개 · 준비 중</span>
        <h2>확인하고, 시작할게요</h2>
        <p>
          실제 회원 소개와 결제는 아직 열리지 않았어요. 성인·본인 확인, 사진
          검토, 결제·환불 검증과 신고 운영을 준비하고 있어요.
        </p>
        <p className={styles.tiny}>
          확인은 인품이나 안전의 보증이 아니에요. 캐릭터와 사주는
          자기이해·대화의 참고로만 사용해요.
        </p>
      </section>
      <button
        type="button"
        className={styles.secondary}
        onClick={() => navigate('/')}
      >
        개인 운세·기존 친구 대화 이용하기
      </button>
      <Tabs current="dating" />
    </main>
  )
}
