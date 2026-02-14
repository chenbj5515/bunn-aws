"use client"
import React from "react";
import { diff_match_patch } from "diff-match-patch";
import { updateReviewTimes } from "./server-functions";
import { usePathname } from "next/navigation";
import { useTranslations } from 'next-intl';

interface IProps {
    originalText: string;
    onBlurChange?: (state: string) => void;
    cardID: string;
    weakBorder?: boolean;
    setDisplayCards?: React.Dispatch<React.SetStateAction<any>>;
}

export function Dictation(props: IProps) {
    const { originalText, cardID, onBlurChange, weakBorder = false, setDisplayCards } = props;
    const pathname = usePathname();
    const t = useTranslations('dictation');

    const dictationRef = React.useRef<HTMLDivElement>(null);
    // 入力内容
    const inputContentRef = React.useRef("");
    const dictationCheckInputRef = React.useRef<HTMLInputElement>(null);

    const answerFinished = dictationCheckInputRef.current?.checked;

    function handleDictationChange() {
        inputContentRef.current = dictationRef.current?.textContent || "";
    }

    async function handleBlur() {
        const dmp = new diff_match_patch();
        const diff = dmp.diff_main(
            originalText,
            dictationRef.current?.textContent || ""
        );
        const htmlString = diff.map(([result, text]) => {
            return `<span class="${result === -1
                ? "text-wrong w-full wrap-break-word pointer-events-none"
                : result === 1
                    ? "text-correct w-full wrap-break-word pointer-events-none"
                    : result === 0
                        ? "w-full wrap-break-word pointer-events-none"
                        : ""
                }">${text}</span>`;
        }).join("");
        // ユーザー入力内容が正しい
        if (diff.length === 1 && diff[0]?.[0] === 0) {
            // チェックが入っていない場合、チェックマークを入れる
            if (!dictationCheckInputRef.current?.checked) {
                dictationCheckInputRef.current?.click();
                if (!pathname.includes('/home') && !pathname.includes('/guide')) {
                    updateReviewTimes(cardID);

                    // 默写完全正确后，执行 setDisplayCards，把当前卡片的 reviewTimes 字段加1
                    if (setDisplayCards) {
                        setDisplayCards((prev: any) => {
                            if (Array.isArray(prev)) {
                                return prev.map((card: any) => {
                                    if (card.id === cardID) {
                                        return {
                                            ...card,
                                            reviewTimes: (card.reviewTimes || 0) + 1
                                        };
                                    }
                                    return card;
                                });
                            }
                            return prev;
                        });
                    }
                }
                if (dictationRef.current) {
                    dictationRef.current.innerHTML = originalText;
                }
            }
        }
        // ユーザー入力内容が違ってる
        else {
            if (dictationRef.current) {
                dictationRef.current.innerHTML = htmlString;
            }
            // チェックが入っているの場合、チェックを外れる
            if (dictationCheckInputRef.current?.checked) {
                dictationCheckInputRef.current?.click();
            }
        }
        onBlurChange?.("blur")
    }

    function handleFocus() {
        if (dictationRef.current) {
            dictationRef.current.textContent = inputContentRef.current;
        }
        onBlurChange?.("focus")
    }

    return (
        <div>
            <div className="relative dark:shadow-dark-shadow mt-2 w-[18px] h-[18px] dictation-check-container">
                <input
                    ref={dictationCheckInputRef}
                    type="checkbox"
                    style={{ display: "none" }}
                />
                <svg
                    className="overflow-visible"
                    viewBox="0 0 64 64"
                    height="18px"
                    width="18px"
                >
                    <path
                        d="M 0 16 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 16 L 32 48 L 64 16 V 8 A 8 8 90 0 0 56 0 H 8 A 8 8 90 0 0 0 8 V 56 A 8 8 90 0 0 8 64 H 56 A 8 8 90 0 0 64 56 V 16"
                        pathLength="575.0541381835938"
                        stroke="grey"
                        style={{
                            fill: "none",
                            strokeWidth: 6,
                            strokeLinecap: "round",
                            strokeLinejoin: "round",
                            strokeDasharray: dictationCheckInputRef.current?.checked
                                ? "70.5096664428711 9999999"
                                : "241 9999999",
                            strokeDashoffset: dictationCheckInputRef.current?.checked ? -262.2723388671875 : 0,
                            transition: "stroke-dasharray 0.5s ease, stroke-dashoffset 0.5s ease",
                        }}
                    ></path>
                </svg>
                <div className="top-[50%] left-7 absolute text-[16px] sm:text-[14px] tracking-[0.03125em] whitespace-nowrap -translate-y-1/2">
                    {t('writeOriginalText')}
                </div>
            </div>
            <div
                suppressContentEditableWarning
                ref={dictationRef}
                className={`${weakBorder ? 'border-gray-200' : ''} dark:border-[#4e4f51] rounded-[15px] p-2 bg-white border focus:outline focus:outline-[1px] focus:outline-[#a9a9a9] ${answerFinished ? "text-[#999]" : ""} dark:bg-bgDark dark:shadow-none w-full mt-4 text-[15px] min-h-[40px]`}
                contentEditable
                onInput={handleDictationChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
            />
        </div>
    );
}
