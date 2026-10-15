from components.git_diff_viewer import generate_side_by_side_diff_html


def test_side_by_side_diff_highlights_add_and_del():
    html = generate_side_by_side_diff_html("A\nB\nC", "A\nX\nC")
    assert "diff-del" in html and "diff-add" in html
    assert "行新增" in html and "行删除" in html


def test_escape_html():
    html = generate_side_by_side_diff_html("<script>", "<script>x")
    assert "&lt;script&gt;" in html
