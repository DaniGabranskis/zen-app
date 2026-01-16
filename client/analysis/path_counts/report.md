# L1+L2 Path Audit

- Evidence engine source: `C:\Users\admin\zen-app\client\src\utils\evidenceEngine.js`
- Flow files: `C:\Users\admin\zen-app\client\src\data\flow\L1.json`, `C:\Users\admin\zen-app\client\src\data\flow\L2.json`
- Cards audited: **22** (binary swipe)
- Total paths: **4,194,304**

## Thresholds

- T_DOM: 0.2
- T_MIX: 0.08
- DELTA_MIX: 0.03
- DELTA_PROBE: 0.0002
- Softmax temperature: 0.9

## Outcome modes

- single: **3,233,930** (77.10%)
- mix: **2** (0.00%)
- probe: **960,372** (22.90%)

## Single mode: dominant emotions

| Emotion | Paths | Share of single |
|---|---:|---:|
| joy | 580,531 | 17.95% |
| gratitude | 372,269 | 11.51% |
| overwhelm | 277,435 | 8.58% |
| loneliness | 255,204 | 7.89% |
| anger | 244,761 | 7.57% |
| guilt | 195,353 | 6.04% |
| shame | 191,948 | 5.94% |
| anxiety | 180,162 | 5.57% |
| irritation | 148,765 | 4.60% |
| disappointment | 139,437 | 4.31% |
| calm | 116,060 | 3.59% |
| confusion | 105,750 | 3.27% |
| sadness | 89,625 | 2.77% |
| clarity | 73,809 | 2.28% |
| tiredness | 73,315 | 2.27% |
| disconnection | 66,591 | 2.06% |
| frustration | 53,131 | 1.64% |
| contentment | 38,751 | 1.20% |
| tension | 30,112 | 0.93% |
| fear | 921 | 0.03% |

## Mix mode: dominant|secondary

| Pair | Paths | Share |
|---|---:|---:|
| gratitude|joy | 2 | 100.00% |

## Probe mode: dominant|secondary

| Pair | Paths | Share |
|---|---:|---:|
| overwhelm|anxiety | 53,520 | 5.57% |
| anxiety|shame | 42,856 | 4.46% |
| anxiety|overwhelm | 39,162 | 4.08% |
| irritation|tension | 35,603 | 3.71% |
| irritation|frustration | 30,815 | 3.21% |
| frustration|irritation | 29,813 | 3.10% |
| tension|irritation | 25,494 | 2.65% |
| calm|contentment | 24,361 | 2.54% |
| contentment|calm | 23,785 | 2.48% |
| calm|clarity | 22,681 | 2.36% |
| guilt|shame | 18,089 | 1.88% |
| loneliness|disappointment | 17,432 | 1.82% |
| clarity|calm | 16,296 | 1.70% |
| shame|guilt | 15,980 | 1.66% |
| disappointment|loneliness | 14,689 | 1.53% |
| loneliness|shame | 14,031 | 1.46% |
| gratitude|joy | 13,851 | 1.44% |
| shame|loneliness | 13,810 | 1.44% |
| joy|gratitude | 13,794 | 1.44% |
| shame|anxiety | 13,036 | 1.36% |
| disappointment|sadness | 12,500 | 1.30% |
| clarity|gratitude | 12,292 | 1.28% |
| gratitude|clarity | 11,847 | 1.23% |
| sadness|disappointment | 11,486 | 1.20% |
| disappointment|guilt | 10,181 | 1.06% |
| guilt|disappointment | 10,149 | 1.06% |
| joy|irritation | 10,071 | 1.05% |
| gratitude|contentment | 9,539 | 0.99% |
| anger|anxiety | 9,471 | 0.99% |
| guilt|irritation | 9,286 | 0.97% |
| contentment|gratitude | 9,224 | 0.96% |
| frustration|disappointment | 8,917 | 0.93% |
| irritation|guilt | 8,873 | 0.92% |
| anger|shame | 8,064 | 0.84% |
| loneliness|sadness | 7,981 | 0.83% |
| irritation|anger | 7,904 | 0.82% |
| irritation|joy | 7,801 | 0.81% |
| disappointment|frustration | 7,771 | 0.81% |
| disappointment|disconnection | 7,746 | 0.81% |
| anger|irritation | 7,657 | 0.80% |
| shame|anger | 7,583 | 0.79% |
| confusion|irritation | 7,229 | 0.75% |
| disconnection|disappointment | 6,940 | 0.72% |
| gratitude|calm | 6,848 | 0.71% |
| irritation|confusion | 6,732 | 0.70% |
| anger|overwhelm | 6,318 | 0.66% |
| anxiety|anger | 6,268 | 0.65% |
| joy|clarity | 6,141 | 0.64% |
| disappointment|tiredness | 6,059 | 0.63% |
| tiredness|disappointment | 5,889 | 0.61% |

_Only top 50 shown. Full data in counts.json._

## Top paths (most confident)

_For each outcome key we keep the top paths by confidence._

### mix:gratitude|joy

- confidence=0.0822 path=1101111111101111111011
- confidence=0.0819 path=1101111111101111111001

### joy

- confidence=0.0793 path=0001111111101111111111
- confidence=0.0793 path=0001111111111111111111
- confidence=0.0793 path=0011111111111111111101
- confidence=0.0793 path=0011111111111111111111
- confidence=0.0793 path=0011111111111111101111
- confidence=0.0793 path=0011111111111111101101
- confidence=0.0793 path=0011111111101111101101
- confidence=0.0793 path=0011111111101111101111

### gratitude

- confidence=0.0780 path=1101101111101111111011
- confidence=0.0780 path=1001111111101111111011
- confidence=0.0778 path=1101101111101111111001
- confidence=0.0770 path=1111111111101111101011
- confidence=0.0770 path=1111111111101111101001
- confidence=0.0770 path=1111111111101111111001
- confidence=0.0770 path=1111111111101111111011
- confidence=0.0763 path=1101111111100111111011

### anxiety

- confidence=0.0754 path=0001011111101110000100
- confidence=0.0754 path=0001011111101110000110
- confidence=0.0751 path=0001101111101110000100
- confidence=0.0741 path=0001101111101110000110
- confidence=0.0731 path=1000101111101110000110
- confidence=0.0731 path=1000101111101110000100
- confidence=0.0730 path=0100101111100110000101
- confidence=0.0729 path=1100011111100110001100

### overwhelm

- confidence=0.0745 path=1000110010100011010100
- confidence=0.0745 path=1000110010100011000100
- confidence=0.0745 path=1000110010100011000110
- confidence=0.0742 path=0000111010101011000100
- confidence=0.0742 path=1000110010100011010110
- confidence=0.0736 path=0010111010110011000100
- confidence=0.0727 path=0000110110110011000101
- confidence=0.0724 path=0000111010101011000110

### fear

- confidence=0.0729 path=1100111111100110000100
- confidence=0.0729 path=1100111111100110000110
- confidence=0.0710 path=0101111111100110000100
- confidence=0.0710 path=0101111111100110000110
- confidence=0.0706 path=0100111111101110000100
- confidence=0.0691 path=1100101111100110000110
- confidence=0.0691 path=1100101111100110000100
- confidence=0.0688 path=0001111111100110000110

### loneliness

- confidence=0.0716 path=0101010111111110001010
- confidence=0.0702 path=0101000111111110001010
- confidence=0.0701 path=0101100111111110001010
- confidence=0.0679 path=0100011110000110001010
- confidence=0.0679 path=0100010111011010101010
- confidence=0.0678 path=0100011010001010011010
- confidence=0.0677 path=0101010111011110001010
- confidence=0.0674 path=0100100111011010101010

### disconnection

- confidence=0.0707 path=0010011010110010000011
- confidence=0.0704 path=0110011010110010000011
- confidence=0.0703 path=0010010010101010000011
- confidence=0.0699 path=0010101010110010000011
- confidence=0.0697 path=0110101010110010000011
- confidence=0.0694 path=0000000010110111000111
- confidence=0.0692 path=0010001010110010000011
- confidence=0.0691 path=0110001010110010000011

### sadness

- confidence=0.0693 path=0100001110100111000010
- confidence=0.0686 path=0100100010110010110001
- confidence=0.0685 path=0100000010110111100000
- confidence=0.0685 path=0100000010110111100100
- confidence=0.0684 path=0100100010110010110101
- confidence=0.0684 path=1000010010101110000010
- confidence=0.0682 path=0010100010101010100000
- confidence=0.0680 path=0010010010101010100000

### anger

- confidence=0.0684 path=0100111110001101010100
- confidence=0.0664 path=1100111101001111010100
- confidence=0.0662 path=0100111100001111010100
- confidence=0.0659 path=1100111110001100010100
- confidence=0.0658 path=0100101110001101010100
- confidence=0.0649 path=1100111111001101010100
- confidence=0.0649 path=0100111111001101110100
- confidence=0.0649 path=0100011110001101010100

### tiredness

- confidence=0.0679 path=1000110010110011110010
- confidence=0.0673 path=0010110010101111000010
- confidence=0.0673 path=0000110110110111000011
- confidence=0.0670 path=0100111010100011110010
- confidence=0.0670 path=0000111110110111100010
- confidence=0.0670 path=0100111010110111100110
- confidence=0.0670 path=0100111010110111100010
- confidence=0.0669 path=0110110010110011000011

### clarity

- confidence=0.0669 path=1100111110111111110100
- confidence=0.0669 path=1100111110111111110110
- confidence=0.0665 path=1100101110111111110110
- confidence=0.0665 path=1100101110111111110100
- confidence=0.0661 path=1100011110111111110110
- confidence=0.0661 path=1100011110111111110100
- confidence=0.0655 path=0100111110110111110101
- confidence=0.0655 path=0100111110110111110111

### shame

- confidence=0.0646 path=0100001110011110001100
- confidence=0.0630 path=0100000110011010101100
- confidence=0.0630 path=0100001110001010001010
- confidence=0.0630 path=0100001110001010001110
- confidence=0.0629 path=0100000110011110001100
- confidence=0.0628 path=0100000111111110101100
- confidence=0.0627 path=0100001101101110101110
- confidence=0.0625 path=0100000111011110101100

### confusion

- confidence=0.0642 path=1000111010110111000110
- confidence=0.0631 path=1000101010110111000110
- confidence=0.0627 path=0000110010100111000111
- confidence=0.0627 path=0010111010110011100100
- confidence=0.0625 path=1010110010110111000100
- confidence=0.0621 path=1010110010100011000010
- confidence=0.0620 path=1000011010110111000110
- confidence=0.0619 path=1000110010100111010110

### guilt

- confidence=0.0641 path=0100001110111110001100
- confidence=0.0629 path=0100011100111110101100
- confidence=0.0629 path=0100001110111100101100
- confidence=0.0619 path=0100101100111110101100
- confidence=0.0619 path=0100001111111110101100
- confidence=0.0618 path=1000000110110010101110
- confidence=0.0616 path=0100001110100110100100
- confidence=0.0616 path=1100000110111110001100

### probe:guilt|shame

- confidence=0.0638 path=0100001100111110101100
- confidence=0.0598 path=0100101100111010001011
- confidence=0.0598 path=0000001100111110101100
- confidence=0.0594 path=0100101100100110101100
- confidence=0.0593 path=0101011110111000001010
- confidence=0.0593 path=0101001110111000001110
- confidence=0.0592 path=0000011100111110101100
- confidence=0.0592 path=0110000000111010001101

### disappointment

- confidence=0.0636 path=0100011110111110100100
- confidence=0.0635 path=1010111010111000000010
- confidence=0.0635 path=0000101110100110100110
- confidence=0.0634 path=0110101010100100100100
- confidence=0.0633 path=1100110010110100000111
- confidence=0.0633 path=0110111010100100100100
- confidence=0.0631 path=0010110010101100100100
- confidence=0.0630 path=1110001010110001000010

### probe:anxiety|fear

- confidence=0.0633 path=0000101111101010000111
- confidence=0.0633 path=0000101111101010000101
- confidence=0.0629 path=0000111111101110001100
- confidence=0.0629 path=0000111111101110001110
- confidence=0.0628 path=0000011111101010000111
- confidence=0.0628 path=0000011111101010000101
- confidence=0.0618 path=0101101111101010000110
- confidence=0.0618 path=0101101111101010000100

### probe:tiredness|disconnection

- confidence=0.0629 path=1000110010100110110110
- confidence=0.0629 path=1000110010100110110010
- confidence=0.0621 path=0010101010111011000010
- confidence=0.0617 path=0000101010110111100110
- confidence=0.0617 path=0000101010110111100010
- confidence=0.0617 path=0010100010110011000011
- confidence=0.0613 path=1000100010110011110110
- confidence=0.0613 path=0000101010110111110010

### probe:disconnection|tiredness

- confidence=0.0629 path=0100010010110111000011
- confidence=0.0613 path=0010001010111111000010
- confidence=0.0609 path=0100010010110111010011
- confidence=0.0609 path=0101101010110011010010
- confidence=0.0608 path=0110110010100110100100
- confidence=0.0608 path=0110110010100110100110
- confidence=0.0603 path=1110000011111111000010
- confidence=0.0602 path=0000110010100110100111

### probe:disappointment|sadness

- confidence=0.0624 path=0110000010110011100100
- confidence=0.0602 path=0010110010111100000001
- confidence=0.0602 path=1010000010111001000010
- confidence=0.0600 path=1100101010110000010011
- confidence=0.0600 path=1100011010110101010010
- confidence=0.0600 path=0010110010101100100000
- confidence=0.0599 path=0110010010100100100100
- confidence=0.0599 path=0000010110100100100011

### probe:fear|anxiety

- confidence=0.0618 path=1000001111100110000110
- confidence=0.0618 path=1000001111100110000100
- confidence=0.0618 path=0000001111101110000110
- confidence=0.0618 path=0000001111101110000100
- confidence=0.0613 path=0100001111110110000101
- confidence=0.0613 path=0100001111100110000110
- confidence=0.0613 path=0100001111100110000100
- confidence=0.0613 path=0100001111100110100100

### probe:joy|gratitude

- confidence=0.0617 path=0110111110101111111100
- confidence=0.0617 path=0110111110101111111110
- confidence=0.0617 path=0110111110101111101110
- confidence=0.0617 path=0110111110101111101100
- confidence=0.0617 path=1110111110100111111100
- confidence=0.0617 path=1110111110100111111110
- confidence=0.0617 path=1110111110100111101110
- confidence=0.0617 path=1110111110100111101100

### probe:disconnection|disappointment

- confidence=0.0616 path=0010000010111111000100
- confidence=0.0594 path=0010100010111111000100
- confidence=0.0593 path=1000111000110110110110
- confidence=0.0590 path=1100101010110110010110
- confidence=0.0589 path=0000001010110101100110
- confidence=0.0587 path=0000111110110110100110
- confidence=0.0587 path=1010111000110010100010
- confidence=0.0585 path=0010100010111100000011

### probe:disconnection|sadness

- confidence=0.0613 path=0000011010111110110000
- confidence=0.0613 path=0000011010111110110100
- confidence=0.0609 path=0000011010101010110010
- confidence=0.0606 path=1000101010110110010010
- confidence=0.0601 path=0000101010111110110000
- confidence=0.0601 path=0000101010111110110100
- confidence=0.0596 path=1010000011110111000010
- confidence=0.0596 path=0100001011111110000011

### probe:sadness|tiredness

- confidence=0.0612 path=0000100010101011100010
- confidence=0.0603 path=0110010010100011100000
- confidence=0.0599 path=0100100010100011010011
- confidence=0.0591 path=1000010010111010010011
- confidence=0.0589 path=1000110010101010100010
- confidence=0.0582 path=0000100110101110000011
- confidence=0.0581 path=0100110010111110000011
- confidence=0.0581 path=0100110010101110010001

### probe:sadness|disconnection

- confidence=0.0610 path=0101100010110010000011
- confidence=0.0599 path=1100010011101110100010
- confidence=0.0597 path=0110000011110111100000
- confidence=0.0597 path=0000101010101110110100
- confidence=0.0594 path=0000010110110111100110
- confidence=0.0594 path=0010000010101010100010
- confidence=0.0592 path=1110011010110110000000
- confidence=0.0591 path=0100001110110110000011

### probe:disconnection|confusion

- confidence=0.0610 path=0010111010100010000011
- confidence=0.0600 path=1000011010110111010110
- confidence=0.0587 path=1110010011100011100010
- confidence=0.0585 path=1010010011101111000010
- confidence=0.0584 path=0001010011110111100110
- confidence=0.0584 path=1100100011100111110110
- confidence=0.0582 path=0100010011101111000011
- confidence=0.0581 path=0000111011111111100110

### probe:clarity|gratitude

- confidence=0.0608 path=1101111110101111010011
- confidence=0.0606 path=1101111110101111010001
- confidence=0.0605 path=1101101110101111010011
- confidence=0.0604 path=1001111110101111010011
- confidence=0.0603 path=1101101110101111010001
- confidence=0.0602 path=1111111110101111000001
- confidence=0.0602 path=1111111110101111000011
- confidence=0.0602 path=1111111110101111010011

### calm

- confidence=0.0608 path=0100111110101111000011
- confidence=0.0604 path=0100101110101111000011
- confidence=0.0600 path=0100011110101111000011
- confidence=0.0590 path=1100111110101110000011
- confidence=0.0588 path=0100111110101110100011
- confidence=0.0587 path=0000111110101111000011
- confidence=0.0587 path=0100001110101111000011
- confidence=0.0587 path=0100111111101111100011

### probe:loneliness|sadness

- confidence=0.0607 path=0100100010110110101100
- confidence=0.0607 path=0100100010110110101000
- confidence=0.0589 path=0010100010111110001000
- confidence=0.0586 path=0101101010110010001010
- confidence=0.0586 path=0100000010110001101010
- confidence=0.0585 path=0101010010110110011000
- confidence=0.0585 path=0100000010100001111010
- confidence=0.0585 path=1100110010111010001010

### probe:gratitude|joy

- confidence=0.0607 path=1011011110010110111101
- confidence=0.0607 path=1011011110010110111111
- confidence=0.0607 path=1011011110010110101111
- confidence=0.0607 path=1011011110010110101101
- confidence=0.0607 path=1011011110011110101101
- confidence=0.0607 path=1011011110011110101111
- confidence=0.0607 path=1011011110011110111111
- confidence=0.0607 path=1011011110011110111101

### probe:sadness|disappointment

- confidence=0.0607 path=1010110000110110100100
- confidence=0.0604 path=0000011110111100000011
- confidence=0.0604 path=0010100010111100000001
- confidence=0.0604 path=1100110010110100000011
- confidence=0.0604 path=0100111010110000100011
- confidence=0.0602 path=0000101110110101100010
- confidence=0.0602 path=1100001010110101010010
- confidence=0.0601 path=1110000011111011000010

### probe:sadness|loneliness

- confidence=0.0604 path=1100100010110010011010
- confidence=0.0601 path=1000010010111010011010
- confidence=0.0599 path=0100010010100010101010
- confidence=0.0597 path=1100000010110010011010
- confidence=0.0595 path=0100110010100010101010
- confidence=0.0591 path=0010010010111110001000
- confidence=0.0589 path=0000010110101010101010
- confidence=0.0588 path=0100011010101010001010

### probe:shame|guilt

- confidence=0.0603 path=0101000100110110101100
- confidence=0.0603 path=1101000100111010001010
- confidence=0.0600 path=0100001110101100001110
- confidence=0.0598 path=0100000110110000101110
- confidence=0.0598 path=1100000110110000101110
- confidence=0.0598 path=1100000110110100001110
- confidence=0.0598 path=0110000010101100001100
- confidence=0.0597 path=0000000110111000101110

### probe:overwhelm|fear

- confidence=0.0601 path=0000011111111111000100
- confidence=0.0599 path=1000111111110110000100
- confidence=0.0599 path=1000111111110110000110
- confidence=0.0599 path=0000111111100010000111
- confidence=0.0599 path=0000111111100010000101
- confidence=0.0599 path=0000111111111110000100
- confidence=0.0597 path=0000111111111110000110
- confidence=0.0596 path=0000011111111111000110

### probe:shame|loneliness

- confidence=0.0600 path=0100000111001010101010
- confidence=0.0586 path=1100010000110010111110
- confidence=0.0584 path=0100000000110011101110
- confidence=0.0581 path=0100001101001110101010
- confidence=0.0577 path=0101000110001010001010
- confidence=0.0576 path=0100100000001010001011
- confidence=0.0576 path=0101100111011100001010
- confidence=0.0575 path=0100110100011010001011

### probe:tiredness|confusion

- confidence=0.0600 path=1010111010110011000010
- confidence=0.0593 path=0010110010100011000011
- confidence=0.0591 path=0000111111101111100010
- confidence=0.0589 path=0010111010110111000000
- confidence=0.0589 path=0000101010110011010011
- confidence=0.0588 path=0010110011101111100000
- confidence=0.0588 path=0100100011101111000011
- confidence=0.0586 path=1010110011101111000010

### probe:loneliness|shame

- confidence=0.0598 path=0000001110011010001010
- confidence=0.0585 path=0000100000111010101110
- confidence=0.0584 path=1100010000111110001110
- confidence=0.0584 path=1100000110010010001010
- confidence=0.0582 path=0100000010011010001110
- confidence=0.0581 path=0100011100001110001010
- confidence=0.0580 path=1100010111001110001010
- confidence=0.0580 path=0110101000101010001010

### probe:confusion|disconnection

- confidence=0.0597 path=0010110011110110100101
- confidence=0.0588 path=0100001010100011010011
- confidence=0.0585 path=0001100011110111100110
- confidence=0.0584 path=0010000010110111000101
- confidence=0.0582 path=0001110010110011110110
- confidence=0.0579 path=0100010011100011110011
- confidence=0.0577 path=0010110010100011100110
- confidence=0.0576 path=1110000011110111100100

## Per-card influence (single only)

_Counts are computed only on outcomes in **single** mode._

| Card | Left: top emotions | Right: top emotions |
|---|---|---|
| L1_mood | loneliness (209353), overwhelm (188488), anger (160664) | joy (451634), gratitude (282777), irritation (95775) |
| L1_body | joy (258289), gratitude (193508), anger (168019) | joy (322242), gratitude (178761), loneliness (171865) |
| L1_energy | gratitude (301422), loneliness (203201), calm (96060) | joy (488869), overwhelm (187990), anger (156365) |
| L1_social | overwhelm (214834), joy (194913), anger (132079) | joy (385618), gratitude (283326), loneliness (159045) |
| L1_control | joy (264339), overwhelm (170291), gratitude (157127) | joy (316192), gratitude (215142), anger (200363) |
| L1_safety | joy (253842), overwhelm (217124), anger (182759) | joy (326689), gratitude (293446), loneliness (142525) |
| L1_self_worth | joy (191943), loneliness (182423), shame (149210) | joy (388588), gratitude (253254), overwhelm (155589) |
| L1_expectations | joy (236523), anger (194710), gratitude (134632) | joy (344008), gratitude (237637), overwhelm (144807) |
| L1_pressure | joy (294647), overwhelm (207380), anger (168680) | joy (285884), gratitude (271946), loneliness (165027) |
| L1_clarity | joy (227976), overwhelm (192334), gratitude (143966) | joy (352555), gratitude (228303), anger (133997) |
| L2_focus | joy (353665), gratitude (187316), overwhelm (146540) | joy (226866), gratitude (184953), loneliness (178556) |
| L2_source | joy (316951), gratitude (231008), loneliness (200544) | joy (263580), overwhelm (218159), gratitude (141261) |
| L2_uncertainty | joy (290363), gratitude (277436), guilt (141785) | joy (290168), overwhelm (222763), anxiety (167055) |
| L2_social_pain | joy (229169), anger (202684), shame (160135) | joy (351362), gratitude (249802), overwhelm (181921) |
| L2_numb | joy (204628), gratitude (194666), loneliness (173440) | joy (375903), anger (218131), gratitude (177603) |
| L2_heavy | joy (194880), loneliness (185009), gratitude (161796) | joy (385651), gratitude (210473), overwhelm (128487) |
| L2_guilt | joy (284870), gratitude (183078), loneliness (130083) | joy (295661), gratitude (189191), overwhelm (172664) |
| L2_shame | joy (276276), gratitude (177829), guilt (131188) | joy (304255), gratitude (194440), overwhelm (174841) |
| L2_positive_moments | loneliness (193392), overwhelm (187443), anger (149650) | joy (452238), gratitude (264292), guilt (102084) |
| L2_regulation | overwhelm (193783), joy (164634), loneliness (141964) | joy (415897), gratitude (235666), anger (125541) |
| L2_clarity | joy (273484), gratitude (177293), overwhelm (172965) | joy (307047), gratitude (194976), loneliness (140775) |
| L2_meaning | loneliness (197199), overwhelm (182219), joy (180088) | joy (400443), gratitude (263050), guilt (119841) |