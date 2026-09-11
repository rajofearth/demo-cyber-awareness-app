package com.awareness.calc

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs
import kotlin.math.floor

private val AppBg = Color(0xFF0E0F13)
private val DigitBg = Color(0xFF1D2027)
private val OpBg = Color(0xFF2B2E38)
private val AccentTeal = Color(0xFF4CC9F0)
private val AlertRed = Color(0xFFFF6B6B)
private val TextPrimary = Color(0xFFF5F6FA)
private val TextSecondary = Color(0xFF8A8FA3)

class CalculatorEngine {
    var display by mutableStateOf("0")
        private set
    var expression by mutableStateOf("")
        private set
    private var acc: Double? = null
    private var pendingOp: Char? = null
    private var replaceEntry = true

    fun digit(d: Char) {
        if (display == "Error") clear()
        if (replaceEntry) {
            display = d.toString()
            replaceEntry = false
        } else if (display.replace("-", "").replace(".", "").length < 12) {
            display = if (display == "0") d.toString() else display + d
        }
    }

    fun dot() {
        if (display == "Error") clear()
        if (replaceEntry) {
            display = "0."
            replaceEntry = false
            return
        }
        if (!display.contains('.')) display += "."
    }

    fun op(c: Char) {
        if (display == "Error") return
        val cur = display.toDoubleOrNull() ?: return
        val a = acc
        acc = when {
            a == null -> cur
            pendingOp != null -> applyOp(a, pendingOp!!, cur)
            else -> cur
        }
        val newAcc = acc
        if (newAcc == null || newAcc.isNaN() || newAcc.isInfinite()) {
            display = "Error"
            acc = null
            pendingOp = null
            expression = ""
            replaceEntry = true
            return
        }
        pendingOp = c
        expression = "${fmt(newAcc)} $c"
        replaceEntry = true
    }

    fun equalsPress() {
        if (display == "Error") return
        val a = acc
        val c = pendingOp
        val cur = display.toDoubleOrNull()
        if (a == null || c == null || cur == null) return
        val r = applyOp(a, c, cur)
        display = fmt(r)
        expression = ""
        acc = null
        pendingOp = null
        replaceEntry = true
    }

    fun clear() {
        display = "0"
        expression = ""
        acc = null
        pendingOp = null
        replaceEntry = true
    }

    fun backspace() {
        if (display == "Error" || replaceEntry) {
            display = "0"
            return
        }
        display = if (display.length > 1) display.dropLast(1) else "0"
        if (display == "-") display = "0"
    }

    private fun applyOp(a: Double, c: Char, b: Double): Double = when (c) {
        '+' -> a + b
        '-' -> a - b
        '×' -> a * b
        '÷' -> if (b == 0.0) Double.NaN else a / b
        else -> b
    }

    private fun fmt(d: Double): String = when {
        d.isNaN() || d.isInfinite() -> "Error"
        d == 0.0 -> "0"
        d == floor(d) && abs(d) < 1e12 -> d.toLong().toString()
        else -> {
            var s = String.format(java.util.Locale.US, "%.8f", d)
            s = s.trimEnd('0').trimEnd('.')
            if (abs(d) >= 1e9) s = String.format(java.util.Locale.US, "%.4e", d)
            s
        }
    }
}

@Composable
fun CalculatorScreen(onInfo: () -> Unit) {
    val engine = remember { CalculatorEngine() }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(AppBg)
            .statusBarsPadding()
            .navigationBarsPadding()
            .padding(horizontal = 12.dp, vertical = 8.dp)
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .weight(1f)
        ) {
            Text(
                text = "ⓘ",
                color = TextSecondary.copy(alpha = 0.35f),
                fontSize = 18.sp,
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .clickable { onInfo() }
                    .padding(8.dp)
            )
            Column(
                modifier = Modifier.align(Alignment.BottomEnd),
                horizontalAlignment = Alignment.End
            ) {
                Text(
                    text = engine.expression,
                    color = TextSecondary,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Normal,
                    maxLines = 1
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    text = engine.display,
                    color = TextPrimary,
                    fontSize = 60.sp,
                    fontWeight = FontWeight.Light,
                    maxLines = 1
                )
            }
        }

        Spacer(modifier = Modifier.height(12.dp))

        KeypadRow(Modifier.weight(1f)) {
            Key("C", OpBg, AlertRed, weight = 1f) { engine.clear() }
            Key("⌫", OpBg, TextPrimary, weight = 1f, fontSize = 26.sp) { engine.backspace() }
            Key("÷", OpBg, AccentTeal, weight = 1f) { engine.op('÷') }
        }
        Spacer(modifier = Modifier.height(8.dp))
        KeypadRow(Modifier.weight(1f)) {
            Key("7", DigitBg, TextPrimary) { engine.digit('7') }
            Key("8", DigitBg, TextPrimary) { engine.digit('8') }
            Key("9", DigitBg, TextPrimary) { engine.digit('9') }
            Key("×", OpBg, AccentTeal) { engine.op('×') }
        }
        Spacer(modifier = Modifier.height(8.dp))
        KeypadRow(Modifier.weight(1f)) {
            Key("4", DigitBg, TextPrimary) { engine.digit('4') }
            Key("5", DigitBg, TextPrimary) { engine.digit('5') }
            Key("6", DigitBg, TextPrimary) { engine.digit('6') }
            Key("−", OpBg, AccentTeal) { engine.op('-') }
        }
        Spacer(modifier = Modifier.height(8.dp))
        KeypadRow(Modifier.weight(1f)) {
            Key("1", DigitBg, TextPrimary) { engine.digit('1') }
            Key("2", DigitBg, TextPrimary) { engine.digit('2') }
            Key("3", DigitBg, TextPrimary) { engine.digit('3') }
            Key("+", OpBg, AccentTeal) { engine.op('+') }
        }
        Spacer(modifier = Modifier.height(8.dp))
        KeypadRow(Modifier.weight(1f)) {
            Key("0", DigitBg, TextPrimary, weight = 2f) { engine.digit('0') }
            Key(".", DigitBg, TextPrimary) { engine.dot() }
            Key("=", AccentTeal, Color(0xFF0E0F13), fontWeight = FontWeight.Bold) { engine.equalsPress() }
        }
    }
}

@Composable
private fun KeypadRow(
    modifier: Modifier = Modifier,
    content: @Composable RowScope.() -> Unit
) {
    Row(
        modifier = modifier
            .fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        content = content
    )
}

@Composable
private fun RowScope.Key(
    label: String,
    bg: Color,
    fg: Color,
    weight: Float = 1f,
    fontSize: TextUnit = 28.sp,
    fontWeight: FontWeight = FontWeight.Medium,
    onClick: () -> Unit
) {
    val haptics = LocalHapticFeedback.current
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.94f else 1f,
        label = "keyScale"
    )
    Box(
        modifier = Modifier
            .weight(weight)
            .fillMaxHeight()
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
                alpha = if (pressed) 0.75f else 1f
            }
            .background(bg, RoundedCornerShape(26.dp))
            .clickable(interactionSource = interactionSource, indication = null) {
                haptics.performHapticFeedback(HapticFeedbackType.LongPress)
                onClick()
            },
        contentAlignment = Alignment.Center
    ) {
        Text(
            text = label,
            color = fg,
            fontSize = fontSize,
            fontWeight = fontWeight
        )
    }
}
