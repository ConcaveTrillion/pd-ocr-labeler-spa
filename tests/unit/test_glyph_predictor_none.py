from pdomain_ocr_labeler_spa.core.glyph.predictions import NoneGlyphPredictor


def test_none_predictor_returns_none_per_word() -> None:
    pred = NoneGlyphPredictor()
    out = pred.predict([object(), object(), object()])  # type: ignore[list-item]
    assert out == [None, None, None]


def test_none_predictor_empty_list() -> None:
    pred = NoneGlyphPredictor()
    assert pred.predict([]) == []
